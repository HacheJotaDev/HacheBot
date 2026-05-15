import { readdirSync, statSync } from 'fs'
import { pathToFileURL } from 'url'
import { join as joinPath } from 'path'
import config from '../../config.ts'
import moment from 'moment-timezone'

interface PluginInfo {
  command: string[]
  category?: string
  description?: string
  use?: string
  isOwner?: boolean
  isDev?: boolean
}

const CATEGORY_ICONS: { [key: string]: string } = {
  general: '⚙️',
  netflix: '🎬',
  tools: '🔧',
  stickers: '🎨',
  groups: '👥',
  owner: '👑',
  developer: '💻',
}

const CATEGORY_ORDER = ['general', 'netflix', 'tools', 'stickers', 'groups']

export default {
  command: ['menu', 'help'],
  category: 'general',
  run: async (sock: any, m: any, { prefix, isOwner }: any) => {
    const pluginFolder = joinPath(process.cwd(), 'plugins')
    const userPlugins: { [cat: string]: PluginInfo[] } = {}
    const ownerPlugins: { [cat: string]: PluginInfo[] } = {}

    // Scan all plugins
    const getFiles = (dir: string): string[] => {
      const list = readdirSync(dir)
      return list.reduce((acc: string[], file) => {
        const filePath = joinPath(dir, file)
        if (statSync(filePath).isDirectory()) return acc.concat(getFiles(filePath))
        if (file.endsWith('.ts') || file.endsWith('.js')) acc.push(filePath)
        return acc
      }, [])
    }

    for (const filePath of getFiles(pluginFolder)) {
      try {
        const fileUrl = pathToFileURL(filePath).href
        const plugin = await import(`${fileUrl}?update=${Date.now()}`)
        const data: PluginInfo = plugin.default
        if (!data?.command) continue

        if (data.category) {
          const cat = data.category.toLowerCase()
          if (!userPlugins[cat]) userPlugins[cat] = []
          userPlugins[cat].push(data)
        } else if (data.isOwner) {
          const cat = 'owner'
          if (!ownerPlugins[cat]) ownerPlugins[cat] = []
          ownerPlugins[cat].push(data)
        }
      } catch {}
    }

    // Build menu
    const time = moment().tz('America/Mexico_City').format('HH:mm:ss')
    const date = moment().tz('America/Mexico_City').format('DD/MM/YYYY')
    const name = m.pushName || 'User'
    const up = process.uptime()
    const uptimeStr = `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`
    const ram = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)} MB`

    // Header
    let menu = `╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
    menu += `┃ ✦ *HACHEBOT* ✦\n`
    menu += `┃ ────────────────────────\n`
    menu += `┃ 👋 Hola, *${name}*\n`
    menu += `┃ 🕐 ${date} • ${time}\n`
    menu += `┃ ⏱️ Uptime: ${uptimeStr}\n`
    menu += `┃ 💾 RAM: ${ram}\n`
    menu += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n`

    // Netflix pool info
    try {
      const { getStats } = await import('../../../lib/nfpool.js')
      const stats = getStats()
      if (stats.total > 0) {
        menu += `\n🎬 *Pool Netflix:* \`${stats.active}\` activas / \`${stats.total}\` total\n`
      }
    } catch {}

    // User categories
    const allCats = Object.keys(userPlugins)
    const sortedCats = [
      ...CATEGORY_ORDER.filter(c => allCats.includes(c)),
      ...allCats.filter(c => !CATEGORY_ORDER.includes(c)).sort(),
    ]

    for (const cat of sortedCats) {
      const icon = CATEGORY_ICONS[cat] || '📁'
      const plugins = userPlugins[cat]
      if (!plugins?.length) continue

      menu += `\n${icon} *${cat.toUpperCase()}*\n`
      menu += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`

      for (const p of plugins) {
        const mainCmd = p.command[0]
        const aliases = p.command.length > 1
          ? ` (${p.command.slice(1).map(a => prefix + a).join(', ')})`
          : ''
        const desc = p.description ? ` — _${p.description}_` : ''
        const usage = p.use ? ` \`${p.use}\`` : ''
        menu += `  ◈ ${prefix}${mainCmd}${usage}${aliases}${desc}\n`
      }
    }

    // Owner section (only if isOwner)
    if (isOwner) {
      const ownerCats = Object.keys(ownerPlugins)
      if (ownerCats.length) {
        menu += `\n╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
        menu += `┃ 👑 *OWNER COMMANDS* 👑\n`
        menu += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n`

        for (const cat of ownerCats) {
          const plugins = ownerPlugins[cat]
          if (!plugins?.length) continue

          for (const p of plugins) {
            const mainCmd = p.command[0]
            const aliases = p.command.length > 1
              ? ` (${p.command.slice(1).map(a => prefix + a).join(', ')})`
              : ''
            const desc = p.description ? ` — _${p.description}_` : ''
            const usage = p.use ? ` \`${p.use}\`` : ''
            menu += `  🔑 ${prefix}${mainCmd}${usage}${aliases}${desc}\n`
          }
        }
      }

      // Permission controls
      menu += `\n🛡️ *PERMISOS*\n`
      menu += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`
      menu += `  🔑 ${prefix}gp — _Autorizar grupo_\n`
      menu += `  🔑 ${prefix}ungp — _Desautorizar grupo_\n`
      menu += `  🔑 ${prefix}glist — _Grupos autorizados_\n`
      menu += `  🔑 ${prefix}priv — _Habilitar privados_\n`
      menu += `  🔑 ${prefix}unpriv — _Deshabilitar privados_\n`
    }

    // Footer
    const totalCmds = Object.keys(userPlugins).reduce((s, k) => s + userPlugins[k].length, 0)
    menu += `\n╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
    menu += `┃ Prefijo: ${config.prefix.map((p: string) => `\`${p}\``).join(' ')}\n`
    menu += `┃ Plugins: \`${totalCmds}\` comandos\n`
    menu += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯`

    await sock.sendMessage(m.chat, {
      text: menu.trim(),
      contextInfo: {
        externalAdReply: {
          title: 'HacheBot',
          body: `${date} • ${time}`,
          mediaType: 1,
          renderLargerThumbnail: false,
          thumbnailUrl: 'https://i.ibb.co/xQ5SM1s/7268d712b954.jpg',
          sourceUrl: null,
        },
      },
    }, { quoted: m })
  },
}
