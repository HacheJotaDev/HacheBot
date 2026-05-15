import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['adminkeys', 'akeys'],
  description: 'Genera o lista gift keys',
  isOwner: true,
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const action = args?.[0]?.toLowerCase()

    // No args — list keys
    if (!action || action === 'list' || action === 'ver') {
      try {
        const filter = args?.[1]?.toLowerCase() || 'available'
        const { data } = await axios.get(`${API_BASE}/admin/keys?filter=${filter}`, {
          headers: { 'X-Admin-Key': 'hache-admin-2024' },
          timeout: 10000,
        })

        if (!data.success) {
          await sock.sendMessage(m.chat, { text: `❌ ${data.error}` }, { quoted: m })
          return
        }

        const keys = data.keys || []
        if (!keys.length) {
          await sock.sendMessage(m.chat, { text: '📋 No hay keys.' }, { quoted: m })
          return
        }

        let msg = `🔑 *ADMIN — KEYS (${keys.length})*\n\n`
        keys.slice(0, 30).forEach((k: any) => {
          const status = k.redeemedBy ? '❌' : '✅'
          msg += `${status} \`${k.code}\` — ${k.credits} cr.\n`
        })

        await sock.sendMessage(m.chat, { text: msg.trim() }, { quoted: m })
      } catch (err: any) {
        await sock.sendMessage(m.chat, {
          text: `❌ Error: ${err.response?.data?.error || err.message}`,
        }, { quoted: m })
      }
      return
    }

    // Generate keys: .akeys gen <cantidad> <creditos>
    if (action === 'gen' || action === 'create') {
      const count = parseInt(args?.[1]) || 1
      const credits = parseInt(args?.[2]) || 3

      if (count < 1 || count > 100) {
        await sock.sendMessage(m.chat, {
          text: `❌ Cantidad debe ser entre 1 y 100.`,
        }, { quoted: m })
        return
      }

      try {
        const { data } = await axios.post(`${API_BASE}/admin/keys`, {
          count,
          credits,
        }, {
          headers: { 'X-Admin-Key': 'hache-admin-2024' },
          timeout: 10000,
        })

        if (!data.success) {
          await sock.sendMessage(m.chat, { text: `❌ ${data.error}` }, { quoted: m })
          return
        }

        let msg = `🔑 *KEYS GENERADAS*\n\n`
        msg += `📊 Cantidad: *${data.generated}*\n`
        msg += `💳 Créditos por key: *${credits}*\n\n`
        msg += `Usa *${prefix}akeys list* para ver las keys.`

        await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
      } catch (err: any) {
        await sock.sendMessage(m.chat, {
          text: `❌ Error: ${err.response?.data?.error || err.message}`,
        }, { quoted: m })
      }
      return
    }

    await sock.sendMessage(m.chat, {
      text: `*Uso:*\n${prefix}akeys gen <cantidad> <creditos>\n${prefix}akeys list\n\n*Ejemplos:*\n${prefix}akeys gen 5 3\n${prefix}akeys list`,
    }, { quoted: m })
  },
}
