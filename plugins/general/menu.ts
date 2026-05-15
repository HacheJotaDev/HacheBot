import config from '../../config.js'
import { pluginCache } from '../../handler.js'

// ── Category metadata ──────────────────────────────────────────────────────
const CAT_META: { [k: string]: { icon: string; name: string } } = {
  general:  { icon: '⚙️',  name: 'GENERAL' },
  netflix:  { icon: '🎬',  name: 'NETFLIX' },
  tools:    { icon: '🔧',  name: 'TOOLS' },
  stickers: { icon: '🎨',  name: 'STICKERS' },
  groups:   { icon: '👥',  name: 'GROUPS' },
  developer:{ icon: '💻',  name: 'DEVELOPER' },
}
const CAT_ORDER = ['general', 'netflix', 'tools', 'stickers', 'groups', 'developer']

export default {
  command: ['menu', 'help'],
  category: 'general',
  description: 'Muestra el menú de comandos',
  run: async (sock: any, m: any, { prefix, isOwner }: any) => {
    // ── Build plugin lists from the already-loaded pluginCache ────────────
    // pluginCache: Map<filePath, pluginExport> — one entry per file
    // Deduplicate by primary command name (aliases share the same object)
    const seen = new Set<any>()
    const allPlugins: any[] = []
    for (const p of pluginCache.values()) {
      if (!seen.has(p)) { seen.add(p); allPlugins.push(p) }
    }

    const userCats: { [cat: string]: any[] } = {}
    const ownerNF: any[] = []
    const ownerPerm: any[] = []
    const ownerOther: any[] = []

    for (const p of allPlugins) {
      if (!p?.command?.length) continue

      // ── Owner-only plugins → owner section ──────────────────────────────
      if (p.isOwner) {
        if (p.category) {
          // Has category but is owner-only (e.g. usuarios, update)
          ownerOther.push(p)
        } else {
          // No category = pure owner command
          const c = p.command[0]
          if (['addcookie','addc','delcookie','delc','cookies','cks','refresh','rfr','detect'].includes(c))
            ownerNF.push(p)
          else if (['gp','ungp','glist','priv','unpriv'].includes(c))
            ownerPerm.push(p)
          else ownerOther.push(p)
        }
        continue
      }

      // ── Dev-only plugins → skip for non-devs ────────────────────────────
      if (p.isDev && !isOwner) continue

      // ── Plugins WITH a category → user sections ─────────────────────────
      if (p.category) {
        const cat = p.category.toLowerCase()
        if (!userCats[cat]) userCats[cat] = []
        userCats[cat].push(p)
      }
      // Plugins without category and without isOwner/isDev → skip
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    const sort = (a: any[]) => a.sort((x, y) => x.command[0].localeCompare(y.command[0]))
    const fmtCmd = (p: any) => {
      const main = p.command[0]
      const alias = p.command.length > 1
        ? ` (${p.command.slice(1).map((a: string) => prefix + a).join(', ')})`
        : ''
      const use = p.use ? ` \`${p.use}\`` : ''
      const desc = p.description ? ` — _${p.description}_` : ''
      return `${prefix}${main}${use}${alias}${desc}`
    }

    // ── Info ──────────────────────────────────────────────────────────────
    const now = new Date()
    const dateStr = now.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = now.toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    const up = process.uptime()
    const uptimeStr = `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`
    const ram = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)} MB`
    const name = m.pushName || 'User'
    const role = isOwner ? '👑 Owner' : '👤 Usuario'

    // ── Build menu ────────────────────────────────────────────────────────
    let t = ''
    t += `╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
    t += `┃ ✦ *HACHEBOT* ✦\n`
    t += `┃ ────────────────────────\n`
    t += `┃ 👋 Hola, *${name}*\n`
    t += `┃ ${role}\n`
    t += `┃ 🕐 ${dateStr} • ${timeStr}\n`
    t += `┃ ⏱️ Uptime: ${uptimeStr}\n`
    t += `┃ 💾 RAM: ${ram}\n`
    t += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n`

    // Netflix pool info
    try {
      const { getStats } = await import('../../lib/nfpool.js')
      const s = getStats()
      if (s.total > 0) t += `\n🎬 *Pool Netflix:* \`${s.active}\` activas / \`${s.total}\` total\n`
    } catch {}

    // ── User categories ───────────────────────────────────────────────────
    const cats = Object.keys(userCats)
    const sorted = [
      ...CAT_ORDER.filter(c => cats.includes(c)),
      ...cats.filter(c => !CAT_ORDER.includes(c)).sort(),
    ]
    for (const cat of sorted) {
      const meta = CAT_META[cat] || { icon: '📁', name: cat.toUpperCase() }
      const plugins_ = sort(userCats[cat])
      if (!plugins_.length) continue
      t += `\n${meta.icon} *${meta.name}*\n`
      t += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`
      for (const p of plugins_) t += `  ◈ ${fmtCmd(p)}\n`
    }

    // ── Owner section ─────────────────────────────────────────────────────
    if (isOwner && (ownerNF.length || ownerPerm.length || ownerOther.length)) {
      t += `\n╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
      t += `┃ 👑 *OWNER COMMANDS* 👑\n`
      t += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n`

      if (ownerNF.length) {
        t += `\n🔑 *NETFLIX ADMIN*\n`
        t += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`
        for (const p of sort(ownerNF)) t += `  🔑 ${fmtCmd(p)}\n`
      }

      if (ownerPerm.length) {
        t += `\n🛡️ *PERMISOS*\n`
        t += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`
        for (const p of sort(ownerPerm)) t += `  🔑 ${fmtCmd(p)}\n`
      }

      if (ownerOther.length) {
        t += `\n⚡ *ADMIN*\n`
        t += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`
        for (const p of sort(ownerOther)) t += `  🔑 ${fmtCmd(p)}\n`
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────
    let total = 0
    for (const c of Object.values(userCats)) total += c.length
    total += ownerNF.length + ownerPerm.length + ownerOther.length

    t += `\n╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
    t += `┃ Prefijo: ${config.prefix.map((p: string) => `\`${p}\``).join(' ')}\n`
    t += `┃ Plugins: \`${total}\` comandos\n`
    t += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯`

    await sock.sendMessage(m.chat, {
      text: t.trim(),
      contextInfo: {
        externalAdReply: {
          title: 'HacheBot',
          body: `${dateStr} • ${timeStr}`,
          mediaType: 1,
          renderLargerThumbnail: false,
          thumbnailUrl: 'https://i.ibb.co/xQ5SM1s/7268d712b954.jpg',
          sourceUrl: null,
        },
      },
    }, { quoted: m })
  },
}
