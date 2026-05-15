import config from '../../config.js'

// ── Category Config ──────────────────────────────────────────────────────────
const CAT_META: { [k: string]: { icon: string; name: string } } = {
  general:   { icon: '⚙️',  name: 'GENERAL' },
  netflix:   { icon: '🎬',  name: 'NETFLIX' },
  tools:     { icon: '🔧',  name: 'TOOLS' },
  stickers:  { icon: '🎨',  name: 'STICKERS' },
  groups:    { icon: '👥',  name: 'GROUPS' },
  developer: { icon: '💻',  name: 'DEVELOPER' },
  owner:     { icon: '👑',  name: 'OWNER' },
}

const CAT_ORDER = ['general', 'netflix', 'tools', 'stickers', 'groups']

export default {
  command: ['menu', 'help'],
  category: 'general',
  description: 'Muestra el menú de comandos',
  run: async (sock: any, m: any, { prefix, isOwner }: any) => {
    const plugins: any[] = (global as any).hachePlugins || []

    // ── Classify plugins ────────────────────────────────────────────────
    const userCats: { [cat: string]: any[] } = {}
    const ownerNF: any[] = []   // Netflix admin (no category)
    const ownerPerm: any[] = [] // Permissions (no category)
    const ownerOther: any[] = [] // Other owner-only (no category)

    for (const p of plugins) {
      if (!p?.command?.length) continue

      // Owner-only WITHOUT category → owner sections
      if (p.isOwner && !p.category) {
        const main = p.command[0]
        if (['addcookie','addc','delcookie','delc','cookies','cks','refresh','rfr','detect'].includes(main)) {
          ownerNF.push(p)
        } else if (['gp','ungp','glist','priv','unpriv'].includes(main)) {
          ownerPerm.push(p)
        } else {
          ownerOther.push(p)
        }
        continue
      }

      // Dev-only without category → skip entirely
      if (p.isDev && !p.category) continue

      // Plugins WITH a category
      if (p.category) {
        // If owner/dev only and user is NOT owner → skip from menu
        if ((p.isOwner || p.isDev) && !isOwner) continue
        const cat = p.category.toLowerCase()
        if (!userCats[cat]) userCats[cat] = []
        userCats[cat].push(p)
      }
    }

    // Sort helper
    const sort = (arr: any[]) => arr.sort((a, b) => a.command[0].localeCompare(b.command[0]))

    // ── Time & System info ──────────────────────────────────────────────
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

    // ── Build menu ──────────────────────────────────────────────────────
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

    // ── User categories ─────────────────────────────────────────────────
    const allCats = Object.keys(userCats)
    const sortedCats = [
      ...CAT_ORDER.filter(c => allCats.includes(c)),
      ...allCats.filter(c => !CAT_ORDER.includes(c)).sort(),
    ]

    for (const cat of sortedCats) {
      const meta = CAT_META[cat] || { icon: '📁', name: cat.toUpperCase() }
      const plugins_ = sort(userCats[cat])
      if (!plugins_.length) continue

      menu += `\n${meta.icon} *${meta.name}*\n`
      menu += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`

      for (const p of plugins_) {
        const mainCmd = p.command[0]
        const aliases = p.command.length > 1
          ? ` (${p.command.slice(1).map((a: string) => prefix + a).join(', ')})`
          : ''
        const desc = p.description ? ` — _${p.description}_` : ''
        const usage = p.use ? ` \`${p.use}\`` : ''
        menu += `  ◈ ${prefix}${mainCmd}${usage}${aliases}${desc}\n`
      }
    }

    // ── Owner Commands (only for owners) ────────────────────────────────
    if (isOwner) {
      const hasNF = ownerNF.length > 0
      const hasPerm = ownerPerm.length > 0
      const hasOther = ownerOther.length > 0

      if (hasNF || hasPerm || hasOther) {
        menu += `\n╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
        menu += `┃ 👑 *OWNER COMMANDS* 👑\n`
        menu += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n`

        if (hasNF) {
          for (const p of sort(ownerNF)) {
            const mainCmd = p.command[0]
            const aliases = p.command.length > 1
              ? ` (${p.command.slice(1).map((a: string) => prefix + a).join(', ')})`
              : ''
            const desc = p.description ? ` — _${p.description}_` : ''
            const usage = p.use ? ` \`${p.use}\`` : ''
            menu += `  🔑 ${prefix}${mainCmd}${usage}${aliases}${desc}\n`
          }
        }

        if (hasPerm) {
          menu += `\n🛡️ *PERMISOS*\n`
          menu += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`
          for (const p of sort(ownerPerm)) {
            const mainCmd = p.command[0]
            const aliases = p.command.length > 1
              ? ` (${p.command.slice(1).map((a: string) => prefix + a).join(', ')})`
              : ''
            const desc = p.description ? ` — _${p.description}_` : ''
            menu += `  🔑 ${prefix}${mainCmd}${aliases}${desc}\n`
          }
        }

        if (hasOther) {
          for (const p of sort(ownerOther)) {
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

    // ── Footer ──────────────────────────────────────────────────────────
    const totalCmds = plugins.length
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
