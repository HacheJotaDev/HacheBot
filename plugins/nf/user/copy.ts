import { pickCookie, incrementUsage, markDead, getAvailableRegions } from '../../lib/nfpool.js'
import { generateToken, extractCookiesFromText, COUNTRIES } from '../../lib/netflix.js'

export default {
  command: ['copy', 'cp'],
  category: 'netflix',
  description: 'Copia una cookie Netflix del pool',
  run: async (sock: any, m: any, { prefix }: any) => {
    const senderId = m.sender.split('@')[0]
    const userRegion = global.db.users[senderId]?.region || null

    const cookie = pickCookie(userRegion || undefined)

    if (!cookie) {
      const regions = getAvailableRegions()
      let msg = '❌ No hay cookies disponibles'
      if (userRegion) msg += ` para la región *${userRegion}*`
      msg += '.'
      if (regions.length) {
        msg += `\n\n🌍 *Regiones disponibles:*\n`
        regions.forEach(r => {
          const c = COUNTRIES[r.code]
          msg += `→ ${c?.flag || '🌍'} \`${r.code}\` (${r.count})\n`
        })
      }
      await m.reply(msg)
      return
    }

    await sock.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    const cd = extractCookiesFromText(cookie.rawCookie)
    if (!cd) {
      await m.reply('❌ Error interno al procesar la cookie del pool.')
      return
    }

    // Verify cookie is still valid before sharing
    const tokenResult = await generateToken(cd)
    if (!tokenResult.success) {
      markDead(cookie.id, tokenResult.error || 'Token generation failed')
      await m.reply(
        `❌ La cookie seleccionada falló y fue marcada como muerta.\n` +
        `Intenta de nuevo con *${prefix}copy*`
      )
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return
    }

    incrementUsage(cookie.id)

    const countryInfo = cookie.country ? COUNTRIES[cookie.country] : null

    let msg = `✅ *COOKIE NETFLIX*\n\n`
    msg += `🍪 *Cookie:*\n\`\`\`${cookie.rawCookie}\`\`\`\n\n`
    msg += `━━━━━━━━━━━━━━━━\n`
    if (countryInfo) msg += `${countryInfo.flag} País: ${countryInfo.name}\n`
    else if (cookie.country) msg += `🌍 País: ${cookie.country}\n`
    if (cookie.plan) msg += `💎 Plan: ${cookie.plan}\n`
    msg += `━━━━━━━━━━━━━━━━`

    await m.reply(msg)
    await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  },
}
