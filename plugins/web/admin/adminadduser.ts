import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['adminadduser', 'aadduser'],
  description: 'Crea un usuario en la web',
  isOwner: true,
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const username = args?.[0]
    const password = args?.[1]
    const credits = parseInt(args?.[2]) || 0

    if (!username || !password) {
      await sock.sendMessage(m.chat, {
        text: `*Uso:* ${prefix}aadduser <usuario> <contraseña> [créditos]\n\n*Ejemplo:*\n${prefix}aadduser juan123 miPass 5`,
      }, { quoted: m })
      return
    }

    try {
      const { data } = await axios.post(`${API_BASE}/admin/users`, {
        username,
        password,
        credits,
      }, {
        headers: { 'X-Admin-Key': 'hache-admin-2024' },
        timeout: 10000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, { text: `❌ ${data.error}` }, { quoted: m })
        return
      }

      const u = data.user
      let msg = `✅ *USUARIO CREADO*\n\n`
      msg += `👤 Username: *${u.username}*\n`
      msg += `💳 Créditos: *${u.credits}*\n`
      msg += `🔑 Rol: ${u.role}\n\n`
      msg += `🔗 Login: https://hachejota.site/login`

      await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
