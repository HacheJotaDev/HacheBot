import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['redeem', 'canjear', 'key'],
  description: 'Canjea una gift key por créditos',
  category: 'web',
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const code = args?.[0]?.trim()?.toUpperCase()

    if (!code) {
      await sock.sendMessage(m.chat, {
        text: `*Uso:* ${prefix}redeem <código>\n\n*Ejemplo:*\n${prefix}redeem HJFLIX-A3K9M`,
      }, { quoted: m })
      return
    }

    const sender = m.sender.split('@')[0]

    await sock.sendMessage(m.chat, { react: { text: '🎁', key: m.key } })

    try {
      const { data } = await axios.post(`${API_BASE}/user/redeem-key`, { code }, {
        headers: { 'X-User-Phone': sender },
        timeout: 10000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, {
          text: `❌ ${data.error || 'Key inválida'}`,
        }, { quoted: m })
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return
      }

      let msg = `🎁 *KEY CANJEADA*\n\n`
      msg += `✨ +${data.credits} créditos\n`
      msg += `🔑 Código: ${code}\n`
      msg += `💳 Total: *${data.credits}* créditos`

      await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
