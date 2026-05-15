import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['admincookies', 'acookies'],
  description: 'Lista o sube cookies al servidor',
  isOwner: true,
  run: async (sock: any, m: any, { prefix }: any) => {
    const msg = m.message
    const hasDocument =
      msg?.documentMessage ||
      msg?.documentWithCaptionMessage?.message?.documentMessage

    // If no file attached, show cookie stats
    if (!hasDocument) {
      try {
        const { data } = await axios.get(`${API_BASE}/admin/cookies`, {
          headers: { 'X-Admin-Key': 'hache-admin-2024' },
          timeout: 10000,
        })

        if (!data.success) {
          await sock.sendMessage(m.chat, { text: `❌ ${data.error}` }, { quoted: m })
          return
        }

        const s = data.stats
        let info = `🍪 *ADMIN — COOKIES*\n\n`
        info += `📊 Total: *${s.total}*\n`
        info += `✅ Activas: *${s.active}*\n`
        info += `💀 Muertas: *${s.dead}*\n\n`
        info += `*Para subir cookies:*\n${prefix}acookies (con archivo .txt o .zip adjunto)`

        await sock.sendMessage(m.chat, { text: info }, { quoted: m })
      } catch (err: any) {
        await sock.sendMessage(m.chat, {
          text: `❌ Error: ${err.response?.data?.error || err.message}`,
        }, { quoted: m })
      }
      return
    }

    // Upload cookies with file
    await sock.sendMessage(m.chat, { react: { text: '📤', key: m.key } })

    try {
      let fileBuffer: Buffer
      const stream = await sock.downloadMediaMessage(m)
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(chunk)
      fileBuffer = Buffer.concat(chunks)

      const fileName = msg?.documentMessage?.fileName || msg?.documentWithCaptionMessage?.message?.documentMessage?.fileName || 'cookies.txt'

      const formData = new FormData()
      formData.append('file', new Blob([fileBuffer]), fileName)

      const { data } = await axios.post(`${API_BASE}/admin/cookies`, formData, {
        headers: {
          'X-Admin-Key': 'hache-admin-2024',
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, { text: `❌ ${data.error || 'Error al subir'}` }, { quoted: m })
        return
      }

      let msg2 = `✅ *COOKIES SUBIDAS*\n\n`
      msg2 += `📊 Total procesadas: *${data.total || data.stats?.total || '?'}*\n`
      if (data.active !== undefined) msg2 += `✅ Activas: *${data.active}*\n`
      if (data.dead !== undefined) msg2 += `💀 Muertas: *${data.dead}*\n`
      if (data.duplicates !== undefined) msg2 += `♻️ Duplicadas: *${data.duplicates}*`

      await sock.sendMessage(m.chat, { text: msg2.trim() }, { quoted: m })
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
