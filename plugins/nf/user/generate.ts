import { pickCookie, incrementUsage, markDead, getAvailableRegions } from '../../lib/nfpool.js'
import { generateToken, getMetadata, extractCookiesFromText, COUNTRIES } from '../../lib/netflix.js'

export default {
  command: ['generate', 'gen'],
  category: 'netflix',
  description: 'Genera un link NFToken de Netflix',
  run: async (sock: any, m: any, { prefix }: any) => {
    // Get user's region preference
    const senderId = m.sender.split('@')[0]
    const userRegion = global.db.users[senderId]?.region || null

    const cookie = pickCookie(userRegion || undefined)

    if (!cookie) {
      const regions = getAvailableRegions()
      let msg = '❌ No hay cookies disponibles'
      if (userRegion) {
        msg += ` para la región *${userRegion}*`
      }
      msg += '.\n\n'
      if (regions.length) {
        msg += '🌍 *Regiones disponibles:*\n'
        regions.forEach(r => {
          const c = COUNTRIES[r.code]
          msg += `→ ${c?.flag || '🌍'} \`${r.code}\` (${r.count})\n`
        })
        if (userRegion) msg += `\nUsa *${prefix}region clear* para usar cualquier región.`
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

    const tokenResult = await generateToken(cd)

    if (!tokenResult.success) {
      markDead(cookie.id, tokenResult.error || 'Token generation failed')
      await m.reply(
        `❌ La cookie seleccionada falló y fue marcada como muerta.\n` +
        `Intenta de nuevo con *${prefix}gen*`
      )
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return
    }

    incrementUsage(cookie.id)

    const meta = await getMetadata(cd)
    const countryInfo = cookie.country ? COUNTRIES[cookie.country] : null

    let msg = `✅ *NETFLIX NFTOKEN*\n\n`
    msg += `🔗 *Link:*\n${tokenResult.link}\n\n`
    msg += `━━━━━━━━━━━━━━━━\n`
    if (countryInfo) msg += `${countryInfo.flag} País: ${countryInfo.name}\n`
    else if (cookie.country) msg += `🌍 País: ${cookie.country}\n`
    if (meta.success) {
      if (meta.plan) msg += `💎 Plan: ${meta.plan}\n`
      if (meta.videoQuality) msg += `📺 Calidad: ${meta.videoQuality}\n`
    }
    msg += `━━━━━━━━━━━━━━━━`

    await m.reply(msg)
    await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  },
}
