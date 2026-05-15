import axios from 'axios'

const API_BASE = 'https://hachejota.site/api'

interface CookieDict { [key: string]: string }

function extractCookies(text: string): CookieDict[] {
  const results: CookieDict[] = []

  // JSON format
  try {
    const data = JSON.parse(text)
    if (Array.isArray(data)) {
      const cd: CookieDict = {}
      for (const item of data) {
        if (item?.name && item?.value &&
          ['NetflixId', 'SecureNetflixId', 'nfvdid', 'OptanonConsent'].includes(item.name))
          cd[item.name] = item.value
      }
      if (cd.NetflixId) return [cd]
    }
  } catch {}

  // Netscape format
  if (text.includes('\t') && (text.includes('NetflixId') || text.includes('nfvdid'))) {
    const cd: CookieDict = {}
    for (const line of text.split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue
      const parts = line.trim().split('\t')
      if (parts.length >= 7) cd[parts[5]] = parts[6]
      if (cd.NetflixId && cd.SecureNetflixId && cd.nfvdid) {
        results.push({ ...cd })
        break
      }
    }
    if (results.length) return results
  }

  // Raw string
  const cd: CookieDict = {}
  for (const [name, regex] of Object.entries({
    nfvdid: /nfvdid=([^;]+)/,
    NetflixId: /NetflixId=([^;]+)/,
    SecureNetflixId: /SecureNetflixId=([^;]+)/,
    OptanonConsent: /OptanonConsent=([^;]+)/,
  })) {
    const m = text.match(regex as RegExp)
    if (m) cd[name] = m[1]
  }
  if (cd.NetflixId) results.push(cd)

  return results
}

function buildCookieString(cd: CookieDict, onlyAndroid = false): string {
  const keys = onlyAndroid ? ['NetflixId', 'SecureNetflixId', 'nfvdid'] : Object.keys(cd)
  return keys.filter(k => cd[k]).map(k => `${k}=${cd[k]}`).join('; ')
}

export default {
  command: ['nfcheck', 'cookie'],
  description: 'Verifica una cookie de Netflix',
  category: 'web',
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const rawText = args?.join(' ')?.trim()

    if (!rawText) {
      await sock.sendMessage(m.chat, {
        text: `*Uso:* ${prefix}nfcheck <cookie>\n\n*Ejemplo:*\n${prefix}nfcheck NetflixId=xxx; SecureNetflixId=yyy; nfvdid=zzz\n\n*Formatos:* Raw, Netscape, JSON`,
      }, { quoted: m })
      return
    }

    await sock.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

    const cookies = extractCookies(rawText)
    if (!cookies.length) {
      await sock.sendMessage(m.chat, { text: '❌ No se detectaron cookies válidas.' }, { quoted: m })
      return
    }

    const cd = cookies[0]
    const cookieStr = buildCookieString(cd)

    try {
      const { data } = await axios.post(`${API_BASE}/check-cookie`, { cookieText: rawText }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      })

      if (!data.success) {
        let msg = `❌ *Cookie inválida*\n`
        if (data.error) msg += `Razón: ${data.error}\n`
        if (data.dailyLimitReached) {
          msg += `\n⚠️ Límite diario alcanzado (${data.usesToday}/${data.dailyLimit})`
          msg += `\nReinicia con *${prefix}resetcheck* (${data.resetCost} créditos)`
        }
        await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        return
      }

      let msg = `✅ *NETFLIX COOKIE VÁLIDA*\n\n`
      msg += `🍪 *Cookie:*\n\`\`\`${cookieStr}\`\`\`\n\n`

      if (data.metadata) {
        msg += `━━━━━━━━━━━━━━━━\n`
        if (data.metadata.country) msg += `🌍 País: ${data.metadata.country}\n`
        if (data.metadata.plan) msg += `💎 Plan: ${data.metadata.plan}\n`
        if (data.metadata.planPrice) msg += `💰 Precio: ${data.metadata.planPrice}\n`
        if (data.metadata.videoQuality) msg += `📺 Calidad: ${data.metadata.videoQuality}\n`
        if (data.metadata.nextBillingDate) msg += `📅 Próximo cobro: ${data.metadata.nextBillingDate}\n`
        if (data.metadata.memberSince) msg += `🗓️ Miembro desde: ${data.metadata.memberSince}\n`
        if (data.metadata.email) msg += `📧 Email: ${data.metadata.email}\n`
        msg += `━━━━━━━━━━━━━━━━\n\n`
      }

      if (data.link) msg += `🔗 *NFToken:*\n${data.link}\n`
      if (data.remainingToday !== undefined) msg += `\n📊 Verificaciones hoy: ${data.usesToday}/${data.dailyLimit}`

      await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
      await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (err: any) {
      await sock.sendMessage(m.chat, {
        text: `❌ Error al verificar: ${err.response?.data?.error || err.message}`,
      }, { quoted: m })
    }
  },
}
