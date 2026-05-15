import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['saldo', 'balance', 'creditos'],
  description: 'Consulta tu saldo de créditos en la web',
  category: 'web',
  run: async (sock: any, m: any, { prefix }: any) => {
    const sender = m.sender.split('@')[0]

    try {
      const { data } = await axios.get(`${API_BASE}/user/balance`, {
        headers: { 'X-User-Phone': sender },
        timeout: 10000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, {
          text: `❌ No tienes cuenta en la web.\n\nRegístrate en *https://hachejota.site*`,
        }, { quoted: m })
        return
      }

      const credits = data.credits || 0
      const transactions = data.transactions || []

      let msg = `💰 *TU SALDO*\n\n`
      msg += `💳 Créditos: *${credits}*\n\n`

      if (transactions.length > 0) {
        msg += `📋 *Últimos movimientos:*\n\n`
        transactions.slice(0, 10).forEach((tx: any) => {
          const icon = tx.credits >= 0 ? '🟢' : '🔴'
          const date = new Date(tx.createdAt).toLocaleDateString('es-MX')
          msg += `${icon} ${tx.credits > 0 ? '+' : ''}${tx.credits} — ${tx.type.replace(/_/g, ' ')}\n`
          if (tx.description) msg += `   _${tx.description}_\n`
          msg += `   ${date}\n\n`
        })
      }

      await sock.sendMessage(m.chat, { text: msg.trim() }, { quoted: m })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error al consultar saldo: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
