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

// ── Pool Access (safe with deep proxy) ───────────────────────────────────────
// We store the pool as a JSON string in global.db.settings['nf_pool_data']
// This avoids the deep proxy bug where nested mutations persist wrong data.
// Every operation reads → modifies → writes back the entire pool atomically.

function readPool(): NFPool {
  try {
    const entry = global.db.settings['nf_pool_data']
    if (entry?.value) return JSON.parse(entry.value)
  } catch {}
  return { cookies: {}, nextId: 1 }
}

function writePool(pool: NFPool) {
  global.db.settings['nf_pool_data'] = { value: JSON.stringify(pool) }
}

// ── Add Cookies ──────────────────────────────────────────────────────────────

export function addCookie(rawCookie: string): { added: boolean; id: string; duplicate?: string } {
  const cd = extractCookiesFromText(rawCookie)
  if (!cd?.NetflixId) return { added: false, id: '' }

  const pool = readPool()

  // Deduplicate by NetflixId
  for (const [cid, entry] of Object.entries(pool.cookies)) {
    if (entry.netflixId === cd.NetflixId) {
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
  writePool(pool)

  return { added: true, id }
}

export function addCookiesFromText(text: string): { added: number; duplicates: number; failed: number } {
  const blocks = extractCookiesFromBlock(text)
  if (!blocks.length) {
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
  const pool = readPool()
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
  const pool = readPool()
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
  const pool = readPool()
  if (pool.cookies[id]) {
    pool.cookies[id].status = 'DEAD'
    pool.cookies[id].lastError = error
    writePool(pool)
  }
}

export function updateCookie(id: string, updates: Partial<CookieEntry>) {
  const pool = readPool()
  if (pool.cookies[id]) {
    for (const [key, value] of Object.entries(updates)) {
      pool.cookies[id][key] = value
    }
    writePool(pool)
  }
}

export function incrementUsage(id: string) {
  const pool = readPool()
  if (pool.cookies[id]) {
    pool.cookies[id].usedCount = (pool.cookies[id].usedCount || 0) + 1
    pool.cookies[id].lastUsed = Date.now()
    writePool(pool)
  }
}

export function deleteCookies(type: 'dead' | 'all' | 'dup'): number {
  const pool = readPool()

  if (type === 'all') {
    const deleted = Object.keys(pool.cookies).length
    pool.cookies = {}
    writePool(pool)
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
    writePool(pool)
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
    writePool(pool)
    return deleted
  }

  return 0
}

export function deleteCookieById(id: string): boolean {
  const pool = readPool()
  if (!pool.cookies[id]) return false
  delete pool.cookies[id]
  writePool(pool)
  return true
}

// ── Get Full Pool ─────────────────────────────────────────────────────────────

export function getPool(): NFPool {
  return readPool()
}

// ── Stats ────────────────────────────────────────────────────────────────────

export function getStats() {
  const pool = readPool()
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
