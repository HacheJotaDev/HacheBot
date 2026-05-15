import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['webstatus', 'status'],
  description: 'Estado del servidor web y configuración pública',
  category: 'web',
  run: async (sock: any, m: any) => {
    try {
      const { data } = await axios.get(`${API_BASE}/config`, { timeout: 10000 })

      if (!data.success) {
        await sock.sendMessage(m.chat, { text: '❌ No se pudo conectar al servidor.' }, { quoted: m })
        return
      }

      const c = data.config
      let msg = `🌐 *ESTADO DEL SERVIDOR*\n\n`
      msg += `✅ Servidor: *Online*\n\n`
      msg += `━━━━━━━━━━━━━━━━\n`
      msg += `📋 *Tarifas:*\n\n`
      msg += `🔗 Generar Token: ${c.GENERATE_COST} crédito(s)\n`
      msg += `🍪 Copiar Cookie: ${c.COPY_COST} crédito(s)\n`
      msg += `📺 Activar TV: ${c.TV_ACTIVATE_COST} crédito(s)\n`
      msg += `🌍 Cambiar Región: ${c.REGION_COST} crédito(s)\n`
      msg += `🔄 Reset Verificaciones: ${c.CHECKER_RESET_COST} crédito(s)\n\n`
      msg += `━━━━━━━━━━━━━━━━\n`
      msg += `📊 *Límites:*\n\n`
      msg += `🔍 Verificaciones/día: ${c.CHECKER_DAILY_LIMIT}\n`
      msg += `🎁 Bonus registro: ${c.REGISTER_BONUS} créditos\n\n`
      msg += `🔗 *Web:* https://hachejota.site`

      await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Servidor offline o inaccesible.\n\n${err.message}`,
      }, { quoted: m })
    }
  },
}
