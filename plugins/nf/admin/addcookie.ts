import JSZip from 'jszip'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { addCookiesFromText, getStats } from '../../../lib/nfpool.js'

/** Download a document message directly from Baileys (bypasses the broken sock.downloadMediaMessage) */
async function downloadDoc(m: any): Promise<Buffer> {
  const raw = m.message
  let docMsg = raw?.documentMessage || raw?.documentWithCaptionMessage?.message?.documentMessage
  if (!docMsg) throw new Error('No document found')

  const stream = await downloadContentFromMessage(docMsg, 'document')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

function getDocInfo(m: any): { fileName: string; isZip: boolean } {
  const raw = m.message
  const docMsg = raw?.documentMessage || raw?.documentWithCaptionMessage?.message?.documentMessage
  const fileName = docMsg?.fileName || ''
  return { fileName, isZip: fileName.toLowerCase().endsWith('.zip') }
}

export default {
  command: ['addcookie', 'addc'],
  description: 'Añade cookies Netflix al pool',
  isOwner: true,
  run: async (sock: any, m: any, { text, prefix }: any) => {
    let cookieText = ''

    // Check for attached file
    const raw = m.message
    const hasDocument =
      raw?.documentMessage ||
      raw?.documentWithCaptionMessage?.message?.documentMessage

    if (hasDocument) {
      await sock.sendMessage(m.chat, { react: { text: '📥', key: m.key } })

      let fileBuffer: Buffer
      try {
        fileBuffer = await downloadDoc(m)
      } catch (e) {
        console.error('Download error:', e)
        await m.reply('❌ No pude descargar el archivo. Intenta enviar el .txt como documento sin comprimir, o pega las cookies directamente.')
        return
      }

      const { fileName, isZip } = getDocInfo(m)

      if (isZip) {
        try {
          const zip = await JSZip.loadAsync(fileBuffer)
          let allText = ''
          for (const [name, file] of Object.entries(zip.files)) {
            if (name.endsWith('.txt') && !file.dir) {
              allText += await file.async('string') + '\n\n'
            }
          }
          cookieText = allText
        } catch {
          await m.reply('❌ Error al descomprimir el archivo ZIP.')
          return
        }
      } else {
        cookieText = fileBuffer.toString('utf-8')
      }
    } else if (m.quoted?.text) {
      cookieText = m.quoted.text
    } else if (text) {
      cookieText = text
    }

    if (!cookieText.trim()) {
      await m.reply(
        `*Uso:* ${prefix}addc <cookie>\n\n` +
        `*Opciones:*\n` +
        `→ ${prefix}addc NetflixId=xxx; SecureNetflixId=yyy; nfvdid=zzz\n` +
        `→ Responde a un mensaje con cookies\n` +
        `→ Adjunta un archivo .txt o .zip`
      )
      return
    }

    const result = addCookiesFromText(cookieText)
    const stats = getStats()

    if (result.added === 0 && result.duplicates === 0) {
      await m.reply('❌ No se encontraron cookies válidas en el texto proporcionado.')
      return
    }

    let resultMsg = `✅ *COOKIES PROCESADAS*\n\n`
    resultMsg += `├ ✨ Nuevas: \`${result.added}\`\n`
    resultMsg += `├ 🔄 Duplicadas: \`${result.duplicates}\`\n`
    if (result.failed) resultMsg += `├ ❌ Fallidas: \`${result.failed}\`\n`
    resultMsg += `└ 📦 Pool: \`${stats.active}\` activas / \`${stats.total}\` total`

    await m.reply(resultMsg)
    await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  },
}
