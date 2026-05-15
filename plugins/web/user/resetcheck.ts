import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['resetcheck', 'resetlimit'],
  description: 'Reinicia tu límite de verificaciones diarias (2 créditos)',
  category: 'web',
  run: async (sock: any, m: any, { prefix }: any) => {
    const sender = m.sender.split('@')[0]

    await sock.sendMessage(m.chat, { react: { text: '🔄', key: m.key } })

    try {
      const { data } = await axios.post(`${API_BASE}/user/checker-reset`, {}, {
        headers: { 'X-User-Phone': sender },
        timeout: 10000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, {
          text: `❌ ${data.error || 'Error al reiniciar'}`,
        }, { quoted: m })
        return
      }

      let msg = `🔄 *LÍMITE REINICIADO*\n\n`
      msg += `✨ ${data.dailyLimit} verificaciones diarias disponibles\n`
      msg += `💳 Créditos restantes: *${data.remainingCredits}*`

      await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
