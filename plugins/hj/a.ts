import axios from 'axios'

// ── Tipos ────────────────────────────────────────────────
interface CookieDict { [key: string]: string }
interface Metadata {
  country_signup?: string; plan?: string; plan_price?: string
  video_quality?: string; max_streams?: string; next_billing?: string
  member_since?: string; email?: string; phone?: string
  payment_method?: string; success: boolean; error?: string
}

// ── Helpers ──────────────────────────────────────────────
function parseNetscapeLine(line: string): CookieDict {
  const parts = line.trim().split('\t')
  if (parts.length >= 7) return { [parts[5]]: parts[6] }
  return {}
}

export function extractCookies(text: string): CookieDict[] {
  const results: CookieDict[] = []

  // JSON (Cookie Editor)
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

  // Netscape
  if (text.includes('\t') && (text.includes('NetflixId') || text.includes('nfvdid'))) {
    const cd: CookieDict = {}
    for (const line of text.split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue
      Object.assign(cd, parseNetscapeLine(line))
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
    const m = text.match(regex)
    if (m) cd[name] = m[1]
  }
  if (cd.NetflixId) results.push(cd)

  return results
}

export function buildCookieString(cd: CookieDict, onlyAndroid = false): string {
  const keys = onlyAndroid ? ['NetflixId', 'SecureNetflixId', 'nfvdid'] : Object.keys(cd)
  return keys.filter(k => cd[k]).map(k => `${k}=${cd[k]}`).join('; ')
}

export async function generateToken(cd: CookieDict): Promise<{ ok: boolean; token?: string; error?: string }> {
  const missing = ['NetflixId', 'SecureNetflixId', 'nfvdid'].filter(k => !cd[k])
  if (missing.length) return { ok: false, error: `Faltan: ${missing.join(', ')}` }
  try {
    const { data } = await axios.post(
      'https://android13.prod.ftl.netflix.com/graphql',
      {
        operationName: 'CreateAutoLoginToken',
        variables: { scope: 'WEBVIEW_MOBILE_STREAMING' },
        extensions: { persistedQuery: { version: 102, id: '76e97129-f4b5-41a0-a73c-12e674896849' } },
      },
      {
        headers: {
          'User-Agent': 'com.netflix.mediaclient/63884 (Linux; U; Android 13; ro; M2007J3SG; Build/TQ1A.230205.001.A2; Cronet/143.0.7445.0)',
          'Content-Type': 'application/json',
          Cookie: buildCookieString(cd, true),
        },
        timeout: 30000,
      }
    )
    const token = data?.data?.createAutoLoginToken
    if (token) return { ok: true, token }
    return { ok: false, error: 'Sin token en respuesta' }
  } catch (e: any) {
    return { ok: false, error: e.message || 'Error de red' }
  }
}

export async function getMetadata(cd: CookieDict): Promise<Metadata> {
  const base: Metadata = { success: false }
  try {
    const res = await axios.get('https://www.netflix.com/account/membership', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Cookie: buildCookieString(cd),
      },
      maxRedirects: 0,
      validateStatus: (s: number) => s < 400,
      timeout: 20000,
    })
    if (res.status >= 300) return { ...base, error: 'Redirect - Cookie inválida' }
    const html: string = res.data
    const match = html.match(/netflix\.reactContext\s*=\s*(\{.+?\})(?=;\s*<\/script>)/s)
    if (!match) return { ...base, error: 'JSON no encontrado' }
    const rc = JSON.parse(
      match[1].replace(/\\x([0-9a-fA-F]{2})/g, (_: string, h: string) => String.fromCharCode(parseInt(h, 16)))
    )
    const models = rc?.models || {}
    const sc = models?.signupContext?.data || {}
    const fields = sc?.flow?.fields || {}
    const plan = fields?.currentPlan?.fields || {}
    const dig = (obj: any, ...keys: string[]): any =>
      keys.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)
    return {
      success: true,
      country_signup: dig(sc, 'userInfo', 'countryOfSignup'),
      plan: plan?.localizedPlanName?.value,
      plan_price: plan?.planPrice?.value,
      video_quality: plan?.videoQuality?.value,
      max_streams: plan?.maxStreams?.value,
      next_billing: plan?.nextBillingDate?.value || fields?.nextBillingDate?.value,
      member_since: plan?.memberSince?.value
        ? new Date(plan.memberSince.value).toISOString().split('T')[0]
        : undefined,
      email: models?.accountInfo?.data?.emailAddress,
    }
  } catch (e: any) {
    return { ...base, error: e.message }
  }
}

// ── Comando /nfcheck ─────────────────────────────────────
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

    const cookies = extractCookies(rawText)
    if (!cookies.length) {
      await sock.sendMessage(m.chat, { text: '❌ No se detectaron cookies válidas.' }, { quoted: m })
      return
    }

    const cd = cookies[0]
    const tokenResult = await generateToken(cd)

    if (!tokenResult.ok) {
      await sock.sendMessage(m.chat, {
        text: `❌ *Cookie inválida*\nRazón: ${tokenResult.error}`,
      }, { quoted: m })
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return
    }

    const meta = await getMetadata(cd)
    const link = `https://netflix.com/?nftoken=${tokenResult.token}`
    const cookieStr = buildCookieString(cd)

    let msg = `✅ *NETFLIX COOKIE VÁLIDA*\n\n`
    msg += `🍪 *Cookie:*\n\`\`\`${cookieStr}\`\`\`\n\n`

    if (meta.success) {
      msg += `━━━━━━━━━━━━━━━━\n`
      msg += `🌍 País: ${meta.country_signup || 'N/A'}\n`
      msg += `💎 Plan: ${meta.plan || 'N/A'}\n`
      msg += `💰 Precio: ${meta.plan_price || 'N/A'}\n`
      msg += `📺 Calidad: ${meta.video_quality || 'N/A'}\n`
      msg += `📅 Próximo cobro: ${meta.next_billing || 'N/A'}\n`
      msg += `🗓️ Miembro desde: ${meta.member_since || 'N/A'}\n`
      if (meta.email) msg += `📧 Email: ${meta.email}\n`
      msg += `━━━━━━━━━━━━━━━━\n\n`
    }

    msg += `🔗 *NFToken Link:*\n${link}`

    await sock.sendMessage(m.chat, { text: msg }, { quoted: m })
    await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  },
}
