import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['adminconfig', 'aconfig'],
  description: 'Configura tarifas y parámetros del servidor',
  isOwner: true,
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const key = args?.[0]?.toUpperCase()
    const value = args?.[1]

    // No args — show current config
    if (!key) {
      try {
        const { data } = await axios.get(`${API_BASE}/admin/config`, {
          headers: { 'X-Admin-Key': 'hache-admin-2024' },
          timeout: 10000,
        })

        if (!data.success) {
          await sock.sendMessage(m.chat, { text: `❌ ${data.error}` }, { quoted: m })
          return
        }

        const c = data.config
        let msg = `⚙️ *ADMIN — CONFIGURACIÓN*\n\n`
        msg += `━━━━━━━━━━━━━━━━\n`
        msg += `🔗 GENERATE_COST: ${c.GENERATE_COST}\n`
        msg += `🍪 COPY_COST: ${c.COPY_COST}\n`
        msg += `📺 TV_ACTIVATE_COST: ${c.TV_ACTIVATE_COST}\n`
        msg += `🌍 REGION_COST: ${c.REGION_COST}\n`
        msg += `🔍 CHECKER_DAILY_LIMIT: ${c.CHECKER_DAILY_LIMIT}\n`
        msg += `🔄 CHECKER_RESET_COST: ${c.CHECKER_RESET_COST}\n`
        msg += `🎁 REGISTER_BONUS: ${c.REGISTER_BONUS}\n`
        msg += `📱 WHATSAPP_VISIBLE: ${c.WHATSAPP_VISIBLE}\n`
        msg += `📱 WHATSAPP_LINK: ${c.WHATSAPP_LINK || 'No configurado'}\n`
        msg += `━━━━━━━━━━━━━━━━\n\n`
        msg += `*Para cambiar:*\n${prefix}aconfig <KEY> <valor>\n\n*Ejemplo:*\n${prefix}aconfig GENERATE_COST 2`

        await sock.sendMessage(m.chat, { text: msg.trim() }, { quoted: m })
      } catch (err: any) {
        await sock.sendMessage(m.chat, {
          text: `❌ Error: ${err.response?.data?.error || err.message}`,
        }, { quoted: m })
      }
      return
    }

    // Set config
    if (!value) {
      await sock.sendMessage(m.chat, {
        text: `❌ Falta el valor.\n\n*Ejemplo:* ${prefix}aconfig GENERATE_COST 2`,
      }, { quoted: m })
      return
    }

    const allowedKeys = [
      'GENERATE_COST', 'COPY_COST', 'TV_ACTIVATE_COST', 'REGION_COST',
      'CHECKER_DAILY_LIMIT', 'CHECKER_RESET_COST', 'REGISTER_BONUS',
      'WHATSAPP_LINK', 'WHATSAPP_VISIBLE',
    ]

    if (!allowedKeys.includes(key)) {
      await sock.sendMessage(m.chat, {
        text: `❌ Key inválida. Keys válidas:\n\n${allowedKeys.join('\n')}`,
      }, { quoted: m })
      return
    }

    try {
      const configUpdate: any = {}
      configUpdate[key] = key === 'WHATSAPP_LINK' || key === 'WHATSAPP_VISIBLE' ? value : Number(value)

      const { data } = await axios.put(`${API_BASE}/admin/config`, {
        config: configUpdate,
      }, {
        headers: { 'X-Admin-Key': 'hache-admin-2024' },
        timeout: 10000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, { text: `❌ ${data.error}` }, { quoted: m })
        return
      }

      await sock.sendMessage(m.chat, {
        text: `✅ *Configuración actualizada*\n\n🔧 ${key} = ${value}`,
      }, { quoted: m })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
