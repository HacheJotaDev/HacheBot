import {
  extractCookiesFromText,
  buildCookieString,
  generateToken,
  getMetadata,
} from '../../lib/netflix.js'

export default {
  command: ['nfcheck', 'cookie'],
  description: 'Verifica una cookie de Netflix y genera NFToken',
  category: 'tools',
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const rawText = args?.join(' ')?.trim()

    if (!rawText) {
      await sock.sendMessage(m.chat, {
        text: `*Uso:* ${prefix}nfcheck <cookie>\n\n*Ejemplo:*\n${prefix}nfcheck NetflixId=xxx; SecureNetflixId=yyy; nfvdid=zzz\n\n*Formatos soportados:* Raw, Netscape, JSON`,
      }, { quoted: m })
      return
    }

    await sock.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

    const cd = extractCookiesFromText(rawText)
    if (!cd) {
      await sock.sendMessage(m.chat, { text: '❌ No se detectaron cookies válidas.' }, { quoted: m })
      return
    }

    const tokenResult = await generateToken(cd)

    if (!tokenResult.success) {
      await sock.sendMessage(m.chat, {
        text: `❌ *Cookie inválida*\nRazón: ${tokenResult.error}`,
      }, { quoted: m })
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return
    }

    const meta = await getMetadata(cd)
    const cookieStr = buildCookieString(cd)

    let msg = `✅ *NETFLIX COOKIE VÁLIDA*\n\n`
    msg += `🍪 *Cookie:*\n\`\`\`${cookieStr}\`\`\`\n\n`

    if (meta.success) {
      msg += `━━━━━━━━━━━━━━━━\n`
      if (meta.country) msg += `🌍 País: ${meta.country}\n`
      if (meta.plan) msg += `💎 Plan: ${meta.plan}\n`
      if (meta.planPrice) msg += `💰 Precio: ${meta.planPrice}\n`
      if (meta.videoQuality) msg += `📺 Calidad: ${meta.videoQuality}\n`
      if (meta.nextBillingDate) msg += `📅 Próximo cobro: ${meta.nextBillingDate}\n`
      if (meta.memberSince) msg += `🗓️ Miembro desde: ${meta.memberSince}\n`
      if (meta.email) msg += `📧 Email: ${meta.email}\n`
      msg += `━━━━━━━━━━━━━━━━\n\n`
    }

    msg += `🔗 *NFToken Link:*\n${tokenResult.link}`

    await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
    await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  },
}
