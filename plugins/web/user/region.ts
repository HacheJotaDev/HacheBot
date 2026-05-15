import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

export default {
  command: ['region', 'pais'],
  description: 'Configura tu región de Netflix (3 créditos)',
  category: 'web',
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const sender = m.sender.split('@')[0]
    const action = args?.[0]?.trim()?.toUpperCase()

    try {
      // GET: show current region + available
      const { data: regionData } = await axios.get(`${API_BASE}/user/region`, {
        headers: { 'X-User-Phone': sender },
        timeout: 10000,
      })

      if (!action || action === 'LIST' || action === 'VER') {
        if (!regionData.success) {
          await sock.sendMessage(m.chat, {
            text: `❌ No tienes cuenta en la web.\n\nRegístrate en *https://hachejota.site*`,
          }, { quoted: m })
          return
        }

        let msg = `🌍 *TU REGIÓN*\n\n`
        msg += `Actual: ${regionData.region ? `*${regionData.region}*` : 'Global (todas)'}\n\n`

        const available = regionData.availableCountries || []
        if (available.length > 0) {
          msg += `📋 *Regiones disponibles:*\n\n`
          available.forEach((c: any) => {
            msg += `→ \`${c.code}\` ${c.name}\n`
          })
          msg += `\n*Para cambiar:*\n${prefix}region PE\n\n*Para resetear (Global):*\n${prefix}region reset`
        } else {
          msg += `⚠️ No hay regiones disponibles actualmente.`
        }

        await sock.sendMessage(m.chat, { text: msg.trim() }, { quoted: m })
        return
      }

      // PUT: change region
      const newRegion = action === 'RESET' || action === 'GLOBAL' ? null : action

      const { data } = await axios.put(`${API_BASE}/user/region`, { region: newRegion }, {
        headers: { 'X-User-Phone': sender },
        timeout: 10000,
      })

      if (!data.success) {
        await sock.sendMessage(m.chat, {
          text: `❌ ${data.error || 'Error al cambiar región'}`,
        }, { quoted: m })
        return
      }

      const regionName = data.region || 'Global'
      let msg = `✅ *Región actualizada*\n\n`
      msg += `🌍 Nueva región: *${regionName}*\n`
      if (data.remainingCredits !== undefined) msg += `💳 Créditos restantes: *${data.remainingCredits}*`

      await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
