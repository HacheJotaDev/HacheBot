import { getPool, updateCookie } from '../../../lib/nfpool.js'
import { extractCountryFromNetflixId, extractCookiesFromText, getMetadata, COUNTRIES } from '../../../lib/netflix.js'

export default {
  command: ['detect'],
  description: 'Detecta países de las cookies sin región',
  isOwner: true,
  run: async (sock: any, m: any) => {
    const pool = getPool()
    const noCountry = Object.values(pool.cookies).filter(c => c.status === 'ACTIVE' && !c.country)

    if (!noCountry.length) {
      await m.reply('✅ Todas las cookies activas ya tienen región detectada.')
      return
    }

    const total = noCountry.length
    const statusMsg = await sock.sendMessage(m.chat, {
      text: `🔍 *DETECTANDO PAÍSES...*\n\nCookies sin región: *${total}*`,
    }, { quoted: m })

    let detected = 0
    let failed = 0
    const detectedCountries: { [code: string]: number } = {}

    for (let i = 0; i < noCountry.length; i++) {
      const cookie = noCountry[i]

      // Fast method: decode NetflixId locally
      let country = extractCountryFromNetflixId(cookie.netflixId)

      // Slow method: fetch metadata from Netflix
      if (!country) {
        const cd = extractCookiesFromText(cookie.rawCookie)
        if (cd) {
          const meta = await getMetadata(cd)
          if (meta.success && meta.country) {
            country = meta.country
          }
        }
      }

      if (country) {
        updateCookie(cookie.id, { country })
        detected++
        detectedCountries[country] = (detectedCountries[country] || 0) + 1
      } else {
        failed++
      }

      // Update progress
      if (i % 5 === 0 || i === total - 1) {
        await sock.sendMessage(m.chat, {
          text: `🔍 *Detectando...*\n${i + 1}/${total} | ✅ ${detected} | ❌ ${failed}`,
          edit: statusMsg.key,
        })
      }

      // Small delay for metadata requests
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 300))
    }

    let resultMsg =
      `✅ *DETECCIÓN COMPLETADA*\n\n` +
      `├ 📊 Total: \`${total}\`\n` +
      `├ ✅ Detectados: \`${detected}\`\n` +
      `└ ❌ Fallidos: \`${failed}\``

    if (Object.keys(detectedCountries).length) {
      resultMsg += `\n\n🌍 *Países detectados:*\n`
      for (const [code, count] of Object.entries(detectedCountries)) {
        const c = COUNTRIES[code]
        resultMsg += `→ ${c?.flag || '🌍'} \`${code}\` ${c?.name || code}: ${count}\n`
      }
    }

    await sock.sendMessage(m.chat, { text: resultMsg, edit: statusMsg.key })
  },
}
