import { pickCookie, incrementUsage, markDead } from '../../../lib/nfpool.js'
import { activateTV, extractCookiesFromText } from '../../../lib/netflix.js'

export default {
  command: ['tv'],
  category: 'netflix',
  description: 'Activa Netflix en TV con código de 8 dígitos',
  use: '<código 8 dígitos>',
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const code = args?.[0]?.trim()

    if (!code || !/^\d{8}$/.test(code)) {
      await m.reply(
        `*Uso:* ${prefix}tv <código 8 dígitos>\n\n` +
        `*Ejemplo:*\n${prefix}tv 12345678\n\n` +
        `_Ingresa el código que aparece en tu TV_`
      )
      return
    }

    const senderId = m.sender.split('@')[0]
    const userRegion = global.db.users[senderId]?.region || null

    const cookie = pickCookie(userRegion || undefined)
    if (!cookie) {
      await m.reply('❌ No hay cookies disponibles para activar TV.')
      return
    }

    await sock.sendMessage(m.chat, { react: { text: '📺', key: m.key } })

    const cd = extractCookiesFromText(cookie.rawCookie)
    if (!cd) {
      await m.reply('❌ Error interno al procesar la cookie del pool.')
      return
    }

    const result = await activateTV(cd, code)

    if (!result.success) {
      if (result.dead) {
        markDead(cookie.id, result.error || 'TV activation failed - dead cookie')
      }
      await m.reply(
        `❌ *ACTIVACIÓN FALLIDA*\n\n` +
        `📺 Código: ${code}\n` +
        `📝 Razón: ${result.error}\n\n` +
        `_Intenta de nuevo con *${prefix}tv ${code}*_`
      )
      await sock.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      return
    }

    incrementUsage(cookie.id)

    await m.reply(
      `✅ *TV ACTIVADA EXITOSAMENTE*\n\n` +
      `📺 Código: ${code}\n` +
      `🎉 Netflix ya está activo en tu TV.`
    )
    await sock.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
  },
}
