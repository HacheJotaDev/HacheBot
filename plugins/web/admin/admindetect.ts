import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['admindetect', 'adetect'],
  description: 'Detecta países de cookies sin región asignada',
  isOwner: true,
  run: async (sock: any, m: any) => {
    await sock.sendMessage(m.chat, { react: { text: '🌍', key: m.key } })

    try {
      const { data } = await axios.post(`${API_BASE}/admin/detect-countries`, {}, {
        headers: { 'X-Admin-Key': 'hache-admin-2024' },
        timeout: 300000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, { text: `❌ ${data.error}` }, { quoted: m })
        return
      }

      const r = data.results
      let msg = `🌍 *DETECCIÓN DE PAÍSES*\n\n`
      msg += `━━━━━━━━━━━━━━━━\n`
      msg += `📊 Procesadas: *${r.processed}*\n`
      msg += `✅ Detectados: *${r.detected}*\n`
      msg += `❌ Fallidas: *${r.failed}*\n`
      msg += `━━━━━━━━━━━━━━━━`

      const countries = data.countries || []
      if (countries.length > 0) {
        msg += `\n\n📋 *Países detectados:*\n\n`
        countries.forEach((c: any) => {
          msg += `${c.flag || '🏳️'} ${c.name} (${c.code}): ${c.count}\n`
        })
      }

      await sock.sendMessage(m.chat, { text: msg.trim() }, { quoted: m })
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
