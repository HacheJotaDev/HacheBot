import JSZip from 'jszip'
import { addCookiesFromText, getStats } from '../../../lib/nfpool.js'

export default {
  command: ['addcookie', 'addc'],
  description: 'Añade cookies Netflix al pool',
  isOwner: true,
  run: async (sock: any, m: any, { text, prefix }: any) => {
    let cookieText = ''

    // Check for attached file
    const msg = m.message
    const hasDocument =
      msg?.documentMessage ||
      msg?.documentWithCaptionMessage?.message?.documentMessage

    if (hasDocument) {
      await sock.sendMessage(m.chat, { react: { text: '📥', key: m.key } })

      let fileBuffer: Buffer
      try {
        const stream = await sock.downloadMediaMessage(m)
        const chunks: Buffer[] = []
        for await (const chunk of stream) chunks.push(chunk)
        fileBuffer = Buffer.concat(chunks)
      } catch {
        await m.reply('❌ No pude descargar el archivo.')
        return
      }

      const fileName =
        msg?.documentMessage?.fileName ||
        msg?.documentWithCaptionMessage?.message?.documentMessage?.fileName ||
        ''

      if (fileName.endsWith('.zip')) {
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

    let msg = `✅ *COOKIES PROCESADAS*\n\n`
    msg += `├ ✨ Nuevas: \`${result.added}\`\n`
    msg += `├ 🔄 Duplicadas: \`${result.duplicates}\`\n`
    if (result.failed) msg += `├ ❌ Fallidas: \`${result.failed}\`\n`
    msg += `└ 📦 Pool: \`${stats.active}\` activas / \`${stats.total}\` total`

    await m.reply(msg)
    await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  },
}
