import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['adminstats', 'astats'],
  description: 'Estadísticas del servidor web',
  isOwner: true,
  run: async (sock: any, m: any) => {
    try {
      const { data } = await axios.get(`${API_BASE}/admin/stats`, {
        headers: { 'X-Admin-Key': 'hache-admin-2024' },
        timeout: 10000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, { text: `❌ ${data.error || 'Error'}` }, { quoted: m })
        return
      }

      const s = data.stats
      let msg = `📊 *ADMIN — ESTADÍSTICAS*\n\n`
      msg += `━━━━━━━━━━━━━━━━\n`
      msg += `👥 Usuarios: *${s.totalUsers}*\n`
      msg += `🍪 Cookies totales: *${s.totalCookies}*\n`
      msg += `✅ Cookies activas: *${s.activeCookies}*\n`
      msg += `💀 Cookies muertas: *${s.deadCookies}*\n`
      msg += `💳 Transacciones: *${s.totalTransactions}*\n`

      if (s.allCookiesDead) msg += `\n⚠️ *ALERTA: Todas las cookies están muertas*`

      const recent = data.recentTransactions || []
      if (recent.length > 0) {
        msg += `\n━━━━━━━━━━━━━━━━\n`
        msg += `📋 *Últimas transacciones:*\n\n`
        recent.slice(0, 8).forEach((tx: any) => {
          const icon = tx.credits >= 0 ? '🟢' : '🔴'
          msg += `${icon} @${tx.user?.username || '?'} → ${tx.credits > 0 ? '+' : ''}${tx.credits} ${tx.type.replace(/_/g, ' ')}\n`
        })
      }

      await sock.sendMessage(m.chat, { text: msg.trim() }, { quoted: m })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
