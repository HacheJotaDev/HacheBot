import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['copycookie', 'copy', 'cookiecopy'],
  description: 'Copia una cookie de Netflix (3 créditos)',
  category: 'web',
  run: async (sock: any, m: any, { prefix }: any) => {
    const sender = m.sender.split('@')[0]

    await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    try {
      const { data } = await axios.post(`${API_BASE}/user/copy-cookie`, {}, {
        headers: { 'X-User-Phone': sender },
        timeout: 30000,
      })

      if (!data.success) {
        let msg = `❌ ${data.error || 'Error al copiar cookie'}`
        if (data.noCookies) msg += '\n\n⚠️ No hay cookies disponibles.'
        await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return
      }

      let msg = `✅ *COOKIE COPIADA*\n\n`
      msg += `🍪 *Cookie:*\n\`\`\`${data.cookie}\`\`\`\n\n`

      if (data.countryName) msg += `🌍 País: ${data.countryName} (${data.country})\n`
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
