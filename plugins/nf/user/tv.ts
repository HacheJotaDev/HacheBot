import { pickCookie, incrementUsage, markDead, getAvailableRegions } from '../../../lib/nfpool.js'
import { activateTV, extractCookiesFromText, COUNTRIES } from '../../../lib/netflix.js'

export default {
  command: ['tv'],
  category: 'netflix',
  description: 'Activa Netflix en TV con código de 8 dígitos',
  use: '<código 8 dígitos>',
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const code = args?.[0]?.trim()

    if (!code || !/^\d{8}$/.test(code)) {
      await m.reply(
        `╭───✦ 彡 *NETFLIX TV* 彡\n` +
        `├● 📺 *Uso* : ${prefix}tv <código 8 dígitos>\n` +
        `├● 📝 *Ejemplo* : ${prefix}tv 12345678\n` +
        `├● 💡 *Info* : Ingresa el código de tu TV\n` +
        `╰───✦ 🚀 by HacheJota`
      )
      return
    }

    const senderId = m.sender.split('@')[0]
    const userRegion = global.db.users[senderId]?.region || null

    // Try up to 3 different cookies if the first one fails
    let cookie = pickCookie(userRegion || undefined)
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

    await sock.sendMessage(m.chat, { react: { text: '📺', key: m.key } })

    const maxRetries = 3
    for (let i = 0; i < maxRetries; i++) {
      if (i > 0) {
        // Pick a different cookie for retry
        cookie = pickCookie(userRegion || undefined)
        if (!cookie) {
          await m.reply('❌ No hay más cookies disponibles para intentar.')
          return
        }
      }

      const cd = extractCookiesFromText(cookie.rawCookie)
      if (!cd) {
        markDead(cookie.id, 'Cookie parse failed')
        continue
      }

      const countryInfo = cookie.country ? COUNTRIES[cookie.country] : null
      const countryLine = countryInfo
        ? `${countryInfo.flag} ${countryInfo.name}`
        : cookie.country || 'Desconocido'

      // Send processing message on first attempt
      if (i === 0) {
        await m.reply(
          `╭───✦ 彡 *NETFLIX TV* 彡\n` +
          `├● 📺 *Código* : ${code}\n` +
          `├● 🌍 *Cookie* : ${countryLine}\n` +
          `├● ⏳ *Estado* : Activando...\n` +
          `╰───✦ 🚀 by HacheJota`
        )
      }

      const result = await activateTV(cd, code)

      if (result.success) {
        incrementUsage(cookie.id)
        await m.reply(
          `╭───✦ 彡 *NETFLIX TV* 彡\n` +
          `├● 📺 *Código* : ${code}\n` +
          `├● 🌍 *Cookie* : ${countryLine}\n` +
          `├● ✅ *Estado* : Activada\n` +
          `├● 🎉 Netflix ya está activo en tu TV\n` +
          `╰───✦ 🚀 by HacheJota`
        )
        await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        return
      }

      if (result.dead) {
        markDead(cookie.id, result.error || 'TV activation failed - dead cookie')
      }

      // If the error is about the code itself (not the cookie), don't retry with another cookie
      if (result.error?.includes('Código inválido') || result.error?.includes('expirado')) {
        await m.reply(
          `╭───✦ 彡 *NETFLIX TV* 彡\n` +
          `├● 📺 *Código* : ${code}\n` +
          `├● ❌ *Estado* : Fallida\n` +
          `├● 📝 *Razón* : ${result.error}\n` +
          `╰───✦ 🚀 by HacheJota`
        )
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return
      }

      // Cookie-related error, try next cookie
      if (i < maxRetries - 1) continue

      // All retries exhausted
      await m.reply(
        `╭───✦ 彡 *NETFLIX TV* 彡\n` +
        `├● 📺 *Código* : ${code}\n` +
        `├● ❌ *Estado* : Fallida\n` +
        `├● 📝 *Razón* : ${result.error}\n` +
        `├● 🔄 Intenta: *${prefix}tv ${code}*\n` +
        `╰───✦ 🚀 by HacheJota`
      )
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    }
  },
}
