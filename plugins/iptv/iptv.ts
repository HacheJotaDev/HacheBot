import axios from 'axios'

// ── IPTV Line Checker (based on TookKit checkLine) ─────────────────────────

const STB_HEADERS: Record<string, string> = {
  'Cookie': 'stb_lang=en; timezone=Europe%2FIstanbul;',
  'X-User-Agent': 'Model: MAG254; Link: Ethernet',
  'Connection': 'Keep-Alive',
  'Accept-Encoding': 'gzip, deflate',
  'Accept': 'application/json,application/javascript,text/javascript,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 2721 Mobile Safari/533.3',
}

function formatDate(val: string | number | null | undefined): string {
  if (!val || val === 'null') return 'N/A'
  if (typeof val === 'number') {
    if (val === 0) return 'Unlimited'
    return new Date(val * 1000).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  const num = Number(val)
  if (!isNaN(num) && num > 0) {
    return new Date(num * 1000).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
  return String(val)
}

interface IPTVResult {
  status: 'hit' | 'bad' | 'timeout'
  host?: string
  username?: string
  password?: string
  url?: string
  info?: Record<string, unknown>
  error?: string
}

async function checkIPTVLine(line: string): Promise<IPTVResult> {
  const trimmed = line.trim()
  let sHost = ''
  let username = ''
  let password = ''

  // Parse URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(trimmed)
  } catch {
    // Try adding http:// if missing
    try {
      parsedUrl = new URL('http://' + trimmed)
    } catch {
      return { status: 'bad', error: 'URL inválida' }
    }
  }

  const hostname = parsedUrl.hostname
  const port = parsedUrl.port || '80'
  sHost = `${hostname}:${port}`

  // Extract credentials from URL params
  username = parsedUrl.searchParams.get('username') || ''
  password = parsedUrl.searchParams.get('password') || ''

  // If no credentials in URL, try combo format host:port:user:pass
  if (!username || !password) {
    // Try path-based extraction: /get.php?username=X&password=Y or /player_api.php?username=X&password=Y
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean)
    // combo format: host:port:username:password
    const hostParts = trimmed.replace(/^https?:\/\//, '').split(':')
    if (hostParts.length >= 4) {
      sHost = `${hostParts[0]}:${hostParts[1]}`
      username = hostParts[2]
      password = hostParts.slice(3).join(':')
    }
  }

  if (!username || !password) {
    return { status: 'bad', error: 'No se encontraron credenciales en la URL' }
  }

  const apiUrl = `http://${sHost}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await axios.get(apiUrl, {
      signal: controller.signal,
      headers: STB_HEADERS,
      timeout: 15000,
      validateStatus: () => true,
    })

    clearTimeout(timeoutId)
    const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data)

    if (text.includes('username') || text.includes('user_info')) {
      try {
        const json = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        const userInfo = json?.user_info || {}
        const serverInfo = json?.server_info || {}
        const accountStatus = String(userInfo.status || '')

        if (accountStatus === 'Active') {
          const m3uUrl = `http://${sHost}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus`
          const realUrl = serverInfo?.url ? String(serverInfo.url) : ''
          const realPort = serverInfo?.port ? String(serverInfo.port) : ''

          return {
            status: 'hit',
            url: m3uUrl,
            host: sHost,
            username,
            password,
            info: {
              status: userInfo.status || 'Active',
              active_cons: String(userInfo.active_cons ?? '0'),
              max_connections: String(userInfo.max_connections ?? '0'),
              created_at: formatDate(userInfo.created_at),
              exp_date: formatDate(userInfo.exp_date),
              timezone: serverInfo?.timezone || userInfo?.timezone || 'N/A',
              real_url: realUrl,
              real_port: realPort,
              m3u_url: m3uUrl,
            },
          }
        }

        // Account exists but not active
        return {
          status: 'bad',
          host: sHost,
          username,
          error: `Cuenta ${accountStatus || 'inactiva'}`,
        }
      } catch {
        if (text.includes('Active')) {
          return {
            status: 'hit',
            url: `http://${sHost}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus`,
            host: sHost,
            username,
            password,
            info: {
              status: 'Active',
              active_cons: '0',
              max_connections: '0',
              created_at: 'N/A',
              exp_date: 'N/A',
              timezone: 'N/A',
            },
          }
        }
      }
    }

    return { status: 'bad', host: sHost, username, error: 'Línea no activa' }
  } catch (e: any) {
    if (e.code === 'ECONNABORTED' || e.name === 'AbortError') {
      return { status: 'timeout', host: sHost, username }
    }
    return { status: 'bad', host: sHost, username, error: 'Conexión fallida' }
  }
}

export default {
  command: ['iptv'],
  category: 'iptv',
  description: 'Verifica una línea IPTV',
  use: '<url iptv>',
  run: async (sock: any, m: any, { text, prefix }: any) => {
    const input = text?.trim()

    if (!input) {
      await m.reply(
        `╭───✦ 彡 *IPTV CHECKER* 彡\n` +
        `├● 📺 *Uso* : ${prefix}iptv <url>\n` +
        `├● 📝 *Ejemplo* : ${prefix}iptv http://host:port/get.php?username=user&password=pass&type=m3u_plus\n` +
        `├● 💡 Soporta URL M3U o combo host:port:user:pass\n` +
        `╰───✦ 🚀 by HacheJota`
      )
      return
    }

    await sock.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

    // Support multiple lines separated by newlines or |
    const lines = input.split(/[\n|]+/).map(l => l.trim()).filter(Boolean)

    if (lines.length === 1) {
      // Single line check
      const result = await checkIPTVLine(lines[0])

      if (result.status === 'hit') {
        const info = result.info || {}
        await m.reply(
          `╭───✦ 彡 *IPTV CHECKER* 彡\n` +
          `├● ✅ *Estado* : HIT (Activa)\n` +
          `├● 🌐 *Host* : ${result.host || 'N/A'}\n` +
          `├● 👤 *Usuario* : ${result.username || 'N/A'}\n` +
          `├● 🔑 *Contraseña* : ${result.password || 'N/A'}\n` +
          `├● 📊 *Conexiones* : ${info.active_cons || '0'}/${info.max_connections || '0'}\n` +
          `├● 📅 *Expira* : ${info.exp_date || 'N/A'}\n` +
          `├● 🕐 *Creada* : ${info.created_at || 'N/A'}\n` +
          `├● 🌍 *Timezone* : ${info.timezone || 'N/A'}\n` +
          `├● 📺 *M3U* : ${info.m3u_url || result.url || 'N/A'}\n` +
          `╰───✦ 🚀 by HacheJota`
        )
        await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      } else if (result.status === 'timeout') {
        await m.reply(
          `╭───✦ 彡 *IPTV CHECKER* 彡\n` +
          `├● ⏱️ *Estado* : TIMEOUT\n` +
          `├● 🌐 *Host* : ${result.host || 'N/A'}\n` +
          `├● 👤 *Usuario* : ${result.username || 'N/A'}\n` +
          `├● 📝 El servidor no respondió\n` +
          `╰───✦ 🚀 by HacheJota`
        )
        await sock.sendMessage(m.chat, { react: { text: '⏱️', key: m.key } })
      } else {
        await m.reply(
          `╭───✦ 彡 *IPTV CHECKER* 彡\n` +
          `├● ❌ *Estado* : BAD\n` +
          `├● 🌐 *Host* : ${result.host || 'N/A'}\n` +
          `├● 👤 *Usuario* : ${result.username || 'N/A'}\n` +
          `├● 📝 *Razón* : ${result.error || 'Línea no activa'}\n` +
          `╰───✦ 🚀 by HacheJota`
        )
        await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      }
    } else {
      // Batch check (max 10 lines)
      const toCheck = lines.slice(0, 10)
      let hits = 0, bads = 0, timeouts = 0
      const results: string[] = []

      await m.reply(
        `╭───✦ 彡 *IPTV CHECKER* 彡\n` +
        `├● 🔍 Verificando ${toCheck.length} líneas...\n` +
        `╰───✦ 🚀 by HacheJota`
      )

      for (const line of toCheck) {
        const result = await checkIPTVLine(line)

        if (result.status === 'hit') {
          hits++
          const info = result.info || {}
          results.push(
            `✅ *HIT* | ${result.host} | ${result.username}:${result.password} | Conexiones: ${info.active_cons}/${info.max_connections} | Expira: ${info.exp_date}`
          )
        } else if (result.status === 'timeout') {
          timeouts++
          results.push(`⏱️ *TIMEOUT* | ${result.host} | ${result.username}`)
        } else {
          bads++
          results.push(`❌ *BAD* | ${result.host} | ${result.username} | ${result.error || 'Inactiva'}`)
        }
      }

      let msg = `╭───✦ 彡 *IPTV CHECKER* 彡\n`
      msg += `├● 📊 *Resumen* : ${toCheck.length} líneas\n`
      msg += `├● ✅ *Hits* : ${hits}\n`
      msg += `├● ❌ *Bad* : ${bads}\n`
      msg += `├● ⏱️ *Timeout* : ${timeouts}\n`
      msg += `├● ────────────────\n`
      for (const r of results) {
        msg += `├● ${r}\n`
      }
      msg += `╰───✦ 🚀 by HacheJota`

      await m.reply(msg)
      await sock.sendMessage(m.chat, { react: { text: hits > 0 ? '✅' : '❌', key: m.key } })
    }
  },
}
