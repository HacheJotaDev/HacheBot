import { pluginCache } from '../../handler.js'
import config from '../../config.js'

// ── Category Config ──────────────────────────────────────────────────────────
const CATEGORY_META: { [key: string]: { icon: string; label: string } } = {
  general:   { icon: '⚙️',  label: 'GENERAL' },
  netflix:   { icon: '🎬',  label: 'NETFLIX' },
  tools:     { icon: '🔧',  label: 'TOOLS' },
  stickers:  { icon: '🎨',  label: 'STICKERS' },
  groups:    { icon: '👥',  label: 'GROUPS' },
  developer: { icon: '💻',  label: 'DEVELOPER' },
  owner:     { icon: '👑',  label: 'OWNER' },
}

const CATEGORY_ORDER = ['general', 'netflix', 'tools', 'stickers', 'groups', 'developer', 'owner']

// Netflix admin commands (owner-only, no category → OWNER COMMANDS section)
const NF_ADMIN_CMDS = new Set(['addcookie', 'addc', 'delcookie', 'delc', 'cookies', 'cks', 'refresh', 'rfr', 'detect'])
// Permission commands (owner-only, no category → PERMISOS section)
const PERM_CMDS = new Set(['gp', 'ungp', 'glist', 'priv', 'unpriv'])

export default {
  command: ['menu', 'help'],
  category: 'general',
  description: 'Muestra el menú de comandos',
  run: async (sock: any, m: any, { prefix, isOwner }: any) => {
    // ── Collect plugins from handler cache (no dynamic re-imports) ────────
    const seen = new Set<string>()
    const userCats: { [cat: string]: any[] } = {}
    const nfOwnerPlugins: any[] = []
    const permOwnerPlugins: any[] = []
    const otherOwnerPlugins: any[] = []

    for (const [filePath, plugin] of pluginCache.entries()) {
      if (!plugin?.command) continue

      // Deduplicate by primary command
      const mainCmd = plugin.command[0]
      if (seen.has(mainCmd)) continue
      seen.add(mainCmd)

      // Owner-only plugins WITHOUT a category → special owner sections
      if (plugin.isOwner && !plugin.category) {
        if (NF_ADMIN_CMDS.has(mainCmd)) {
          nfOwnerPlugins.push(plugin)
        } else if (PERM_CMDS.has(mainCmd)) {
          permOwnerPlugins.push(plugin)
        } else {
          otherOwnerPlugins.push(plugin)
        }
        continue
      }

      // Dev-only plugins without category → skip from menu
      if (plugin.isDev && !plugin.category) continue

      // Plugins WITH a category
      if (plugin.category) {
        // If plugin is owner/dev only and user is NOT owner → skip
        if ((plugin.isOwner || plugin.isDev) && !isOwner) continue

        const cat = plugin.category.toLowerCase()
        if (!userCats[cat]) userCats[cat] = []
        userCats[cat].push(plugin)
      }
    }

    // ── Sort helper ───────────────────────────────────────────────────────
    const sortPlugins = (arr: any[]) =>
      arr.sort((a, b) => a.command[0].localeCompare(b.command[0]))

    // ── Time & System info ────────────────────────────────────────────────
    const now = new Date()
    const dateStr = now.toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const timeStr = now.toLocaleTimeString('es-MX', {
      timeZone: 'America/Mexico_City',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    })
    const up = process.uptime()
    const uptimeStr = `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`
    const ram = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)} MB`
    const name = m.pushName || 'User'

    // ── Build menu ────────────────────────────────────────────────────────
    let menu = ''
    menu += `╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
    menu += `┃ ✦ *HACHEBOT* ✦\n`
    menu += `┃ ────────────────────────\n`
    menu += `┃ 👋 Hola, *${name}*\n`
    menu += `┃ 🕐 ${dateStr} • ${timeStr}\n`
    menu += `┃ ⏱️ Uptime: ${uptimeStr}\n`
    menu += `┃ 💾 RAM: ${ram}\n`
    menu += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n`

    // Netflix pool info
    try {
      const { getStats } = await import('../../lib/nfpool.js')
      const stats = getStats()
      if (stats.total > 0) {
        menu += `\n🎬 *Pool Netflix:* \`${stats.active}\` activas / \`${stats.total}\` total\n`
      }
    } catch {}

    // ── User categories (sorted) ──────────────────────────────────────────
    const allCats = Object.keys(userCats)
    const sortedCats = [
      ...CATEGORY_ORDER.filter(c => allCats.includes(c)),
      ...allCats.filter(c => !CATEGORY_ORDER.includes(c)).sort(),
    ]

    for (const cat of sortedCats) {
      const meta = CATEGORY_META[cat] || { icon: '📁', label: cat.toUpperCase() }
      const plugins = sortPlugins(userCats[cat])
      if (!plugins.length) continue

      menu += `\n${meta.icon} *${meta.label}*\n`
      menu += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`

      for (const p of plugins) {
        const mainCmd = p.command[0]
        const aliases = p.command.length > 1
          ? ` (${p.command.slice(1).map((a: string) => prefix + a).join(', ')})`
          : ''
        const desc = p.description ? ` — _${p.description}_` : ''
        const usage = p.use ? ` \`${p.use}\`` : ''
        menu += `  ◈ ${prefix}${mainCmd}${usage}${aliases}${desc}\n`
      }
    }

    // ── Owner Commands Section (only for owners) ──────────────────────────
    if (isOwner) {
      const hasNfAdmin = nfOwnerPlugins.length > 0
      const hasPerms = permOwnerPlugins.length > 0
      const hasOther = otherOwnerPlugins.length > 0

      if (hasNfAdmin || hasPerms || hasOther) {
        menu += `\n╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
        menu += `┃ 👑 *OWNER COMMANDS* 👑\n`
        menu += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n`

        // Netflix admin subsection
        if (hasNfAdmin) {
          for (const p of sortPlugins(nfOwnerPlugins)) {
            const mainCmd = p.command[0]
            const aliases = p.command.length > 1
              ? ` (${p.command.slice(1).map((a: string) => prefix + a).join(', ')})`
              : ''
            const desc = p.description ? ` — _${p.description}_` : ''
            const usage = p.use ? ` \`${p.use}\`` : ''
            menu += `  🔑 ${prefix}${mainCmd}${usage}${aliases}${desc}\n`
          }
        }

        // Permission subsection
        if (hasPerms) {
          menu += `\n🛡️ *PERMISOS*\n`
          menu += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`
          for (const p of sortPlugins(permOwnerPlugins)) {
            const mainCmd = p.command[0]
            const aliases = p.command.length > 1
              ? ` (${p.command.slice(1).map((a: string) => prefix + a).join(', ')})`
              : ''
            const desc = p.description ? ` — _${p.description}_` : ''
            menu += `  🔑 ${prefix}${mainCmd}${aliases}${desc}\n`
          }
        }

        // Other owner plugins
        if (hasOther) {
          for (const p of sortPlugins(otherOwnerPlugins)) {
            const mainCmd = p.command[0]
            const aliases = p.command.length > 1
              ? ` (${p.command.slice(1).map((a: string) => prefix + a).join(', ')})`
              : ''
            const desc = p.description ? ` — _${p.description}_` : ''
            menu += `  🔑 ${prefix}${mainCmd}${aliases}${desc}\n`
          }
        }
      }
    }

    // ── Footer ────────────────────────────────────────────────────────────
    const totalCmds = seen.size
    menu += `\n╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
    menu += `┃ Prefijo: ${config.prefix.map((p: string) => `\`${p}\``).join(' ')}\n`
    menu += `┃ Plugins: \`${totalCmds}\` comandos\n`
    menu += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯`

    await sock.sendMessage(m.chat, {
      text: menu.trim(),
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
