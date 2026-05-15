import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['generate', 'gen', 'token'],
  description: 'Genera un NFToken de Netflix (1 crédito)',
  category: 'web',
  run: async (sock: any, m: any, { prefix }: any) => {
    const sender = m.sender.split('@')[0]

    await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    try {
      const { data } = await axios.post(`${API_BASE}/user/generate`, {}, {
        headers: { 'X-User-Phone': sender },
        timeout: 30000,
      })

      if (!data.success) {
        let msg = `❌ ${data.error || 'Error al generar token'}`
        if (data.noCookies) msg += '\n\n⚠️ No hay cookies disponibles en el servidor.'
        if (data.remainingCredits !== undefined) msg += `\n\n💳 Créditos restantes: ${data.remainingCredits}`
        await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return
      }

      let msg = `✅ *TOKEN GENERADO*\n\n`
      msg += `🔗 *Link:*\n${data.link}\n\n`

      if (data.countryName) msg += `🌍 País: ${data.countryName}\n`
      if (data.country) msg += `🏳️ Código: ${data.country}\n`
      if (data.plan) msg += `💎 Plan: ${data.plan}\n`
      msg += `\n💳 Créditos restantes: *${data.remainingCredits}*`

      await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
