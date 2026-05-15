import {
  extractCookiesFromText,
  buildCookieString,
  generateToken,
  getMetadata,
  COUNTRIES,
} from '../../../lib/netflix.js'

export default {
  command: ['nfcheck', 'cookie'],
  description: 'Verifica una cookie de Netflix y genera NFToken',
  category: 'tools',
  run: async (sock: any, m: any, { text, prefix }: any) => {
    // Support: direct text, reply to message, or quoted text
    let rawText = text?.trim()

    if (!rawText && m.quoted?.text) {
      rawText = m.quoted.text.trim()
    }

    if (!rawText) {
      await sock.sendMessage(m.chat, {
        text:
          `*Uso:* ${prefix}nfcheck <cookie>\n\n` +
          `*Opciones:*\n` +
          `→ ${prefix}nfcheck NetflixId=xxx; SecureNetflixId=yyy; nfvdid=zzz\n` +
          `→ Responde a un mensaje con cookies + ${prefix}nfcheck\n\n` +
          `*Formatos soportados:* Raw, Netscape, JSON`,
      }, { quoted: m })
      return
    }

    await sock.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

    const cd = extractCookiesFromText(rawText)
    if (!cd) {
      await m.reply('❌ No se detectaron cookies válidas en el texto proporcionado.')
      return
    }

    const tokenResult = await generateToken(cd)

    if (!tokenResult.success) {
      await m.reply(`❌ *Cookie inválida*\n\n📝 Razón: ${tokenResult.error}`)
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return
    }

    const meta = await getMetadata(cd)
    const cookieStr = buildCookieString(cd)
    const countryInfo = meta.country ? COUNTRIES[meta.country] : null

    let msg = `✅ *NETFLIX COOKIE VÁLIDA*\n\n`
    msg += `🍪 *Cookie:*\n\`\`\`${cookieStr}\`\`\`\n\n`

    if (meta.success) {
      msg += `━━━━━━━━━━━━━━━━\n`
      if (countryInfo) msg += `${countryInfo.flag} País: ${countryInfo.name} (${meta.country})\n`
      else if (meta.country) msg += `🌍 País: ${meta.country}\n`
      if (meta.plan) msg += `💎 Plan: ${meta.plan}\n`
      if (meta.planPrice) msg += `💰 Precio: ${meta.planPrice}\n`
      if (meta.videoQuality) msg += `📺 Calidad: ${meta.videoQuality}\n`
      if (meta.nextBillingDate) msg += `📅 Próximo cobro: ${meta.nextBillingDate}\n`
      if (meta.memberSince) msg += `🗓️ Miembro desde: ${meta.memberSince}\n`
      if (meta.email) msg += `📧 Email: ${meta.email}\n`
      msg += `━━━━━━━━━━━━━━━━\n\n`
    }

    msg += `🔗 *NFToken Link:*\n${tokenResult.link}`

    await m.reply(msg)
    await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  },
}
