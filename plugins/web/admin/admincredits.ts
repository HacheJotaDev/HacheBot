import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['admincredits', 'acredits'],
  description: 'Modificar créditos de un usuario',
  isOwner: true,
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const username = args?.[0]
    const amount = parseInt(args?.[1])

    if (!username || isNaN(amount)) {
      await sock.sendMessage(m.chat, {
        text: `*Uso:* ${prefix}acredits <usuario> <cantidad>\n\n*Ejemplos:*\n${prefix}acredits juan 10\n${prefix}acredits maria -5`,
      }, { quoted: m })
      return
    }

    try {
      // First get users to find the ID
      const { data: usersData } = await axios.get(`${API_BASE}/admin/users`, {
        headers: { 'X-Admin-Key': 'hache-admin-2024' },
        timeout: 10000,
      })

      if (!usersData.success) {
        await sock.sendMessage(m.chat, { text: `❌ Error obteniendo usuarios` }, { quoted: m })
        return
      }

      const user = usersData.users.find((u: any) =>
        u.username.toLowerCase() === username.toLowerCase()
      )

      if (!user) {
        await sock.sendMessage(m.chat, { text: `❌ Usuario *${username}* no encontrado.` }, { quoted: m })
        return
      }

      const { data } = await axios.put(`${API_BASE}/admin/credits`, {
        userId: user.id,
        amount,
        description: `Admin grant via bot`,
      }, {
        headers: { 'X-Admin-Key': 'hache-admin-2024' },
        timeout: 10000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, { text: `❌ ${data.error || 'Error'}` }, { quoted: m })
        return
      }

      const u = data.user
      let msg = `✅ *CRÉDITOS ACTUALIZADOS*\n\n`
      msg += `👤 Usuario: *${u.username}*\n`
      msg += `${amount >= 0 ? '🟢' : '🔴'} Cambio: ${amount > 0 ? '+' : ''}${amount}\n`
      msg += `💳 Nuevo saldo: *${u.credits}*`

      await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
