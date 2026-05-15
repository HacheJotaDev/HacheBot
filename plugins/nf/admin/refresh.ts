import { getPool, markDead, updateCookie } from '../../lib/nfpool.js'
import { generateToken, getMetadata, extractCookiesFromText, getProgressBar } from '../../lib/netflix.js'

export default {
  command: ['refresh', 'rfr'],
  description: 'Valida y actualiza todas las cookies del pool',
  isOwner: true,
  run: async (sock: any, m: any) => {
    const pool = getPool()
    const cookies = Object.values(pool.cookies).filter(c => c.status === 'ACTIVE')

    if (!cookies.length) {
      await m.reply('❌ No hay cookies activas para refrescar.')
      return
    }

    const total = cookies.length
    const statusMsg = await sock.sendMessage(m.chat, {
      text: `🔄 *REFRESCANDO COOKIES...*\n\nTotal: *${total}* cookies activas`,
    }, { quoted: m })

    let alive = 0
    let dead = 0
    let refreshed = 0

    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i]

      if (i % 3 === 0 || i === total - 1) {
        const bar = getProgressBar(i, total)
        await sock.sendMessage(m.chat, {
          text: `🔄 *Refrescando...*\n${bar}\n${i}/${total} | ✅ ${alive} | 💀 ${dead}`,
          edit: statusMsg.key,
        })
      }

      const cd = extractCookiesFromText(cookie.rawCookie)
      if (!cd) {
        markDead(cookie.id, 'No se pudo extraer cookie')
        dead++
        continue
      }

      const tokenResult = await generateToken(cd)
      if (!tokenResult.success) {
        markDead(cookie.id, tokenResult.error || 'Token generation failed')
        dead++
        continue
      }

      alive++

      // Update metadata
      const meta = await getMetadata(cd)
      if (meta.success) {
        const updates: any = {}
        if (meta.country && meta.country !== cookie.country) {
          updates.country = meta.country
          refreshed++
        }
        if (meta.plan && meta.plan !== cookie.plan) {
          updates.plan = meta.plan
          refreshed++
        }
        if (Object.keys(updates).length) {
          updateCookie(cookie.id, updates)
        }
      }

      // Small delay to avoid rate limiting
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 300))
    }

    await sock.sendMessage(m.chat, {
      text:
        `✅ *REFRESH COMPLETADO*\n\n` +
        `├ 📊 Total: \`${total}\`\n` +
        `├ ✅ Vivas: \`${alive}\`\n` +
        `├ 💀 Muertas: \`${dead}\`\n` +
        `└ 🔄 Actualizadas: \`${refreshed}\``,
      edit: statusMsg.key,
    })
  },
}
