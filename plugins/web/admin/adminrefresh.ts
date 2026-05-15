import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['adminrefresh', 'arefresh'],
  description: 'Refresca y valida todas las cookies del servidor',
  isOwner: true,
  run: async (sock: any, m: any, { prefix }: any) => {
    await sock.sendMessage(m.chat, { react: { text: '🔄', key: m.key } })

    try {
      const onlyActive = m.text?.includes('active') ? '?active=true' : ''

      const { data } = await axios.post(`${API_BASE}/admin/refresh-cookies${onlyActive}`, {}, {
        headers: { 'X-Admin-Key': 'hache-admin-2024' },
        timeout: 300000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, { text: `❌ ${data.error}` }, { quoted: m })
        return
      }

      const r = data.results
      let msg = `🔄 *REFRESH COMPLETADO*\n\n`
      msg += `━━━━━━━━━━━━━━━━\n`
      msg += `🔍 Revisadas: *${r.checked}*\n`
      msg += `✅ Vivas: *${r.alive}*\n`
      msg += `💀 Muertas: *${r.dead}*\n`
      msg += `🌍 Países detectados: *${r.countriesFound}*\n`
      msg += `━━━━━━━━━━━━━━━━`

      const countries = data.countries || []
      if (countries.length > 0) {
        msg += `\n\n📋 *Países:*\n\n`
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
