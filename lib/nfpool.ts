import { extractCookiesFromText, extractCookiesFromBlock, buildCookieString } from './netflix.js'

// ── Types ────────────────────────────────────────────────────────────────────
export interface CookieEntry {
  id: string
  rawCookie: string
  netflixId: string
  status: 'ACTIVE' | 'DEAD'
  country: string | null
  plan: string | null
  usedCount: number
  lastUsed: number | null
  lastError: string | null
  addedAt: number
}

export interface NFPool {
  cookies: { [id: string]: CookieEntry }
  nextId: number
}

// ── Pool Access ──────────────────────────────────────────────────────────────

export function getPool(): NFPool {
  if (!global.db.settings['nf_pool']) {
    global.db.settings['nf_pool'] = { cookies: {}, nextId: 1 }
  }
  return global.db.settings['nf_pool']
}

// ── Add Cookies ──────────────────────────────────────────────────────────────

export function addCookie(rawCookie: string): { added: boolean; id: string; duplicate?: string } {
  const pool = getPool()
  const cd = extractCookiesFromText(rawCookie)
  if (!cd?.NetflixId) return { added: false, id: '' }

  // Deduplicate by NetflixId
  for (const [cid, entry] of Object.entries(pool.cookies)) {
    if ((entry as CookieEntry).netflixId === cd.NetflixId) {
      return { added: false, id: cid, duplicate: cid }
    }
  }

  const id = `c${pool.nextId}`
  pool.cookies[id] = {
    id,
    rawCookie,
    netflixId: cd.NetflixId,
    status: 'ACTIVE',
    country: null,
    plan: null,
    usedCount: 0,
    lastUsed: null,
    lastError: null,
    addedAt: Date.now(),
  }
  pool.nextId = pool.nextId + 1

  return { added: true, id }
}

export function addCookiesFromText(text: string): { added: number; duplicates: number; failed: number } {
  const blocks = extractCookiesFromBlock(text)
  if (!blocks.length) {
    // Try as single raw cookie text
    const result = addCookie(text)
    return {
      added: result.added ? 1 : 0,
      duplicates: result.duplicate ? 1 : 0,
      failed: !result.added && !result.duplicate ? 1 : 0,
    }
  }

  let added = 0, duplicates = 0, failed = 0
  for (const cd of blocks) {
    const rawCookie = buildCookieString(cd)
    const result = addCookie(rawCookie)
    if (result.added) added++
    else if (result.duplicate) duplicates++
    else failed++
  }
  return { added, duplicates, failed }
}

// ── Query ────────────────────────────────────────────────────────────────────

export function getActiveCookies(region?: string): CookieEntry[] {
  const pool = getPool()
  let cookies = Object.values(pool.cookies).filter(c => c.status === 'ACTIVE')
  if (region) {
    cookies = cookies.filter(c => c.country === region)
  }
  return cookies
}

export function pickCookie(region?: string): CookieEntry | null {
  const active = getActiveCookies(region)
  if (!active.length) return null
  return active[Math.floor(Math.random() * active.length)]
}

export function getAvailableRegions(): { code: string; count: number }[] {
  const pool = getPool()
  const counts: { [code: string]: number } = {}
  Object.values(pool.cookies)
    .filter(c => c.status === 'ACTIVE' && c.country)
    .forEach(c => {
      counts[c.country!] = (counts[c.country!] || 0) + 1
    })
  return Object.entries(counts)
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
}

// ── Modify ───────────────────────────────────────────────────────────────────

export function markDead(id: string, error: string) {
  const pool = getPool()
  if (pool.cookies[id]) {
    pool.cookies[id].status = 'DEAD'
    pool.cookies[id].lastError = error
  }
}

export function updateCookie(id: string, updates: Partial<CookieEntry>) {
  const pool = getPool()
  if (pool.cookies[id]) {
    for (const [key, value] of Object.entries(updates)) {
      pool.cookies[id][key] = value
    }
  }
}

export function incrementUsage(id: string) {
  const pool = getPool()
  if (pool.cookies[id]) {
    pool.cookies[id].usedCount = (pool.cookies[id].usedCount || 0) + 1
    pool.cookies[id].lastUsed = Date.now()
  }
}

export function deleteCookies(type: 'dead' | 'all' | 'dup'): number {
  const pool = getPool()

  if (type === 'all') {
    const deleted = Object.keys(pool.cookies).length
    pool.cookies = {}
    return deleted
  }

  const remaining: { [id: string]: CookieEntry } = {}

  if (type === 'dead') {
    let deleted = 0
    for (const [id, c] of Object.entries(pool.cookies)) {
      if (c.status === 'DEAD') deleted++
      else remaining[id] = c
    }
    pool.cookies = remaining
    return deleted
  }

  if (type === 'dup') {
    let deleted = 0
    const seen = new Set<string>()
    for (const [id, c] of Object.entries(pool.cookies)) {
      if (seen.has(c.netflixId)) {
        deleted++
      } else {
        seen.add(c.netflixId)
        remaining[id] = c
      }
    }
    pool.cookies = remaining
    return deleted
  }

  return 0
}

export function deleteCookieById(id: string): boolean {
  const pool = getPool()
  if (!pool.cookies[id]) return false
  const remaining: { [cid: string]: CookieEntry } = {}
  for (const [cid, c] of Object.entries(pool.cookies)) {
    if (cid !== id) remaining[cid] = c
  }
  pool.cookies = remaining
  return true
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function getStats() {
  const pool = getPool()
  const cookies = Object.values(pool.cookies)
  const total = cookies.length
  const active = cookies.filter(c => c.status === 'ACTIVE').length
  const dead = total - active
  const countries: { [code: string]: number } = {}
  cookies.filter(c => c.status === 'ACTIVE' && c.country).forEach(c => {
    countries[c.country!] = (countries[c.country!] || 0) + 1
  })
  const totalUses = cookies.reduce((sum, c) => sum + (c.usedCount || 0), 0)
  return { total, active, dead, countries, totalUses }
}
