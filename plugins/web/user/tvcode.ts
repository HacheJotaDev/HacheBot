import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['tvcode', 'tv', 'activatetv'],
  description: 'Activa Netflix en TV con código (5 créditos)',
  category: 'web',
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const code = args?.[0]?.trim()

    if (!code) {
      await sock.sendMessage(m.chat, {
        text: `*Uso:* ${prefix}tvcode <código>\n\nIngresa el código que aparece en tu TV de Netflix.\n\n*Ejemplo:*\n${prefix}tvcode A8B2K`,
      }, { quoted: m })
      return
    }

    const sender = m.sender.split('@')[0]

    await sock.sendMessage(m.chat, { react: { text: '📺', key: m.key } })

    try {
      const { data } = await axios.post(`${API_BASE}/user/tv-activate`, { code }, {
        headers: { 'X-User-Phone': sender },
        timeout: 30000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, {
          text: `❌ ${data.error || 'Error al activar TV'}`,
        }, { quoted: m })
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return
      }

      let msg = `✅ *TV ACTIVADA EXITOSAMENTE*\n\n`
      msg += `📺 Tu Netflix ya está vinculado en la TV.\n`
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
