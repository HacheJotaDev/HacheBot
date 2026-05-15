import os from 'os'
import moment from 'moment-timezone'
import { getStats } from '../../lib/nfpool.js'

export default {
  command: ['info', 'botinfo'],
  description: 'Muestra datos técnicos del bot',
  category: 'general',
  run: async (sock: any, m: any) => {
    const up = process.uptime()
    const h = Math.floor(up / 3600)
    const min = Math.floor((up % 3600) / 60)
    const s = Math.floor(up % 60)
    const cpu = os.cpus()[0]?.model.trim() || 'Desconocido'
    const cores = os.cpus().length
    const memFree = (os.freemem() / 1024 / 1024).toFixed(0)
    const memTotal = (os.totalmem() / 1024 / 1024).toFixed(0)
    const memBot = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)
    const platform = `${os.platform()} ${os.release()} (${os.arch()})`
    const nodeV = process.version
    const host = os.hostname()

    const now = moment().tz('America/Mexico_City').format('DD/MM/YYYY • HH:mm:ss')

    let info = `╭━━━━━━━━━━━━━━━━━━━━━━━━╮\n`
    info += `┃ ✦ *HACHEBOT* ✦ — Info\n`
    info += `╰━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`

    info += `⚙️ *SISTEMA*\n`
    info += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`
    info += `◈ Uptime: ${h}h ${min}m ${s}s\n`
    info += `◈ Plataforma: ${platform}\n`
    info += `◈ Node.js: ${nodeV}\n`
    info += `◈ Host: ${host}\n`
    info += `◈ CPU: ${cpu} (${cores} núcleos)\n`
    info += `◈ RAM Bot: ${memBot} MB\n`
    info += `◈ RAM Libre: ${memFree} / ${memTotal} MB\n`

    // Netflix pool info
    try {
      const stats = getStats()
      info += `\n🎬 *NETFLIX POOL*\n`
      info += `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`
      info += `◈ Cookies: ${stats.active} activas / ${stats.total} total\n`
      info += `◈ Muertas: ${stats.dead}\n`
      info += `◈ Usos totales: ${stats.totalUses}\n`

      const countryCount = Object.keys(stats.countries).length
      if (countryCount) info += `◈ Regiones: ${countryCount}\n`
    } catch {}

    info += `\n📅 ${now}`

    await sock.sendMessage(m.chat, {
      text: info.trim(),
      contextInfo: {
        externalAdReply: {
          title: 'HacheBot Info',
          body: `Uptime: ${h}h ${min}m ${s}s`,
          mediaType: 1,
          renderLargerThumbnail: false,
          thumbnailUrl: 'https://i.ibb.co/xQ5SM1s/7268d712b954.jpg',
          sourceUrl: null,
        },
      },
    }, { quoted: m })
  },
}
