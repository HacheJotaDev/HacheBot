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

      if (p.isOwner) {
        if (p.category) {
          ownerOther.push(p)
        } else {
          const c = p.command[0]
          if (['addcookie','addc','delcookie','delc','cookies','cks','refresh','rfr','detect'].includes(c))
            ownerNF.push(p)
          else if (['gp','ungp','glist','priv','unpriv'].includes(c))
            ownerPerm.push(p)
          else ownerOther.push(p)
        }
        continue
      }

      if (p.isDev && !isOwner) continue

      if (p.category) {
        const cat = p.category.toLowerCase()
        if (!userCats[cat]) userCats[cat] = []
        userCats[cat].push(p)
      }
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    const sort = (a: any[]) => a.sort((x, y) => x.command[0].localeCompare(y.command[0]))
    const fmtCmd = (p: any) => {
      const main = p.command[0]
      const alias = p.command.length > 1
        ? ` / ${p.command.slice(1).map((a: string) => prefix + a).join(', ')}`
        : ''
      const use = p.use ? ` ${p.use}` : ''
      const desc = p.description ? ` → ${p.description}` : ''
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

    let total = 0
    for (const c of Object.values(userCats)) total += c.length
    total += ownerNF.length + ownerPerm.length + ownerOther.length

    const prefijos = config.prefix.map((p: string) => `${p}`).join(' ')
    const SEPARATOR = `╰───✦ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`

    // ── Build menu ────────────────────────────────────────────────────────
    let t = ''

    // ── Header ────────────────────────────────────────────────────────────
    t += `╭───✦ 彡 HACHEBOT 彡\n`
    if (isOwner) {
      t += `├● 👋 Hola : ${name}\n`
      t += `├● 👑 Owner : Owner\n`
      t += `├● 🕐 fecha : ${dateStr} • ${timeStr}\n`
    } else {
      t += `├● 🤖 estado : Activo\n`
      t += `├● 👤 usuario : Usuario\n`
      t += `├● 🕐 fecha : ${dateStr}\n`
      t += `├● ⏰ hora : ${timeStr}\n`
    }
    t += `├● ⏱️ uptime : ${uptimeStr}\n`
    t += `├● 💾 ram : ${ram}\n`
    if (!isOwner) {
      t += `├● 🔌 plugins : ${total} comandos\n`
      t += `├● 🔣 prefijos : ${prefijos}\n`
    }
    t += `╰───✦ 🚀 by HacheJota\n`

    // ── Netflix pool ──────────────────────────────────────────────────────
    try {
      const { getStats } = await import('../../lib/nfpool.js')
      const s = getStats()
      if (s.total > 0) {
        t += `\n╭───✦ 🎬 POOL\n`
        t += `├● ✅ Activas : ${s.active}\n`
        t += `├● 📦 Total : ${s.total}\n`
        t += `╰───✦ 🚀 by HacheJota`
      }
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
      t += `\n\n╭───✦ ${meta.icon} ${meta.name}\n`
      for (let i = 0; i < plugins_.length; i++) {
        const p = plugins_[i]
        if (i === plugins_.length - 1) {
          t += `╰● ◈ ${fmtCmd(p)}\n`
        } else {
          t += `├● ◈ ${fmtCmd(p)}\n`
        }
      }
      t += SEPARATOR
    }

    // ── Owner section ─────────────────────────────────────────────────────
    if (isOwner && (ownerNF.length || ownerPerm.length || ownerOther.length)) {
      t += `\n\n╭───✦ 👑 OWNER COMMANDS\n`
      t += SEPARATOR

      if (ownerNF.length) {
        t += `\n\n╭───✦ 🔑 NETFLIX ADMIN\n`
        const sorted_ = sort(ownerNF)
        for (let i = 0; i < sorted_.length; i++) {
          const p = sorted_[i]
          if (i === sorted_.length - 1) {
            t += `╰● ◈ ${fmtCmd(p)}\n`
          } else {
            t += `├● ◈ ${fmtCmd(p)}\n`
          }
        }
        t += SEPARATOR
      }

      if (ownerPerm.length) {
        t += `\n\n╭───✦ 🛡️ PERMISOS\n`
        const sorted_ = sort(ownerPerm)
        for (let i = 0; i < sorted_.length; i++) {
          const p = sorted_[i]
          if (i === sorted_.length - 1) {
            t += `╰● ◈ ${fmtCmd(p)}\n`
          } else {
            t += `├● ◈ ${fmtCmd(p)}\n`
          }
        }
        t += SEPARATOR
      }

      if (ownerOther.length) {
        t += `\n\n╭───✦ ⚡ ADMIN\n`
        const sorted_ = sort(ownerOther)
        for (let i = 0; i < sorted_.length; i++) {
          const p = sorted_[i]
          if (i === sorted_.length - 1) {
            t += `╰● ◈ ${fmtCmd(p)}\n`
          } else {
            t += `├● ◈ ${fmtCmd(p)}\n`
          }
        }
        t += SEPARATOR
      }
    }

    // ── Footer (owner only) ───────────────────────────────────────────────
    if (isOwner) {
      t += `\n\n╭───✦ 📌 INFO\n`
      t += `├● 🔣 Prefijos : ${prefijos}\n`
      t += `├● 🔌 Plugins : ${total} comandos\n`
      t += `╰───✦ 🚀 by HacheJota`
    }

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
