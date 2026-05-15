import { getAvailableRegions } from '../../lib/nfpool.js'
import { COUNTRIES } from '../../lib/netflix.js'

export default {
  command: ['region', 'rg'],
  category: 'netflix',
  description: 'Gestiona tu región de Netflix',
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const senderId = m.sender.split('@')[0]
    const userRegion = global.db.users[senderId]?.region || null
    const action = args?.[0]?.trim()?.toLowerCase()

    // Show current region + available regions
    if (!action) {
      const regions = getAvailableRegions()
      let msg = `🌍 *TU REGIÓN*\n\n`

      if (userRegion) {
        const ci = COUNTRIES[userRegion]
        msg += `Actual: ${ci?.flag || '🌍'} *${userRegion}* — ${ci?.name || userRegion}\n\n`
      } else {
        msg += `Actual: *Global* (cualquier región)\n\n`
      }

      if (regions.length) {
        msg += `📋 *REGIONES DISPONIBLES:*\n\n`
        regions.forEach(r => {
          const c = COUNTRIES[r.code]
          const current = r.code === userRegion ? ' ◄' : ''
          msg += `→ ${c?.flag || '🌍'} \`${r.code}\` ${c?.name || r.code} (${r.count})${current}\n`
        })
      } else {
        msg += `_No hay regiones detectadas en el pool._\n_Solicita al owner que use *${prefix}detect*_`
      }

      msg += `\n\n*Comandos:*\n`
      msg += `→ \`${prefix}region <código>\` — Establecer región\n`
      msg += `→ \`${prefix}region clear\` — Usar cualquier región`

      await m.reply(msg)
      return
    }

    // Clear region
    if (action === 'clear' || action === 'off') {
      if (!global.db.users[senderId]) {
        global.db.users[senderId] = { user: m.sender, coins: 0 }
      }
      global.db.users[senderId].region = null
      await m.reply('🌍 *Región eliminada*\n\nAhora recibirás cookies de cualquier región.')
      return
    }

    // Set region
    const code = action.toUpperCase()
    if (!COUNTRIES[code]) {
      await m.reply(
        `❌ Región inválida: *${code}*\n\n` +
        `Usa *${prefix}region* para ver las regiones disponibles.`
      )
      return
    }

    if (!global.db.users[senderId]) {
      global.db.users[senderId] = { user: m.sender, coins: 0 }
    }
    global.db.users[senderId].region = code

    const ci = COUNTRIES[code]
    await m.reply(`${ci.flag} *Región establecida: ${ci.name}*\n\nSolo recibirás cookies de esta región.`)
  },
}
