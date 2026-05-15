import { getStats } from '../../lib/nfpool.js'
import { COUNTRIES } from '../../lib/netflix.js'

export default {
  command: ['cookies', 'cks'],
  description: 'Muestra estadísticas del pool de cookies',
  isOwner: true,
  run: async (sock: any, m: any) => {
    const stats = getStats()

    if (stats.total === 0) {
      await m.reply('📦 El pool de cookies está vacío.\n\nUsa *.addc* para añadir cookies.')
      return
    }

    let msg = `📊 *COOKIE POOL*\n\n`
    msg += `├ 📦 Total: \`${stats.total}\`\n`
    msg += `├ ✅ Activas: \`${stats.active}\`\n`
    msg += `├ 💀 Muertas: \`${stats.dead}\`\n`
    msg += `└ 🔄 Usos totales: \`${stats.totalUses}\`\n`

    const countryEntries = Object.entries(stats.countries) as [string, number][]
    if (countryEntries.length) {
      msg += `\n🌍 *POR REGIÓN:*\n\n`
      countryEntries
        .sort((a, b) => b[1] - a[1])
        .forEach(([code, count]) => {
          const c = COUNTRIES[code]
          msg += `→ ${c?.flag || '🌍'} \`${code}\` ${c?.name || code}: ${count}\n`
        })
    }

    await m.reply(msg)
  },
}
