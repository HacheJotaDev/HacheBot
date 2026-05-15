import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['adminusers', 'ausers'],
  description: 'Lista de usuarios de la web',
  isOwner: true,
  run: async (sock: any, m: any, { args }: any) => {
    try {
      const { data } = await axios.get(`${API_BASE}/admin/users`, {
        headers: { 'X-Admin-Key': 'hache-admin-2024' },
        timeout: 10000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, { text: `❌ ${data.error || 'Error'}` }, { quoted: m })
        return
      }

      const users = data.users || []
      if (!users.length) {
        await sock.sendMessage(m.chat, { text: '📋 No hay usuarios registrados.' }, { quoted: m })
        return
      }

      let msg = `👥 *ADMIN — USUARIOS (${users.length})*\n\n`

      users.slice(0, 30).forEach((u: any, i: number) => {
        const role = u.role === 'ADMIN' ? '👑' : '👤'
        const region = u.region ? ` [${u.region}]` : ''
        msg += `${role} \`${u.username}\` — 💳 ${u.credits} cr.${region}\n`
      })

      if (users.length > 30) msg += `\n_...y ${users.length - 30} más._`

      await sock.sendMessage(m.chat, { text: msg.trim() }, { quoted: m })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
