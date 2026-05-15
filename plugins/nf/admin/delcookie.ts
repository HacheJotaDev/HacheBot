import { deleteCookies, deleteCookieById } from '../../../lib/nfpool.js'

export default {
  command: ['delcookie', 'delc'],
  description: 'Elimina cookies del pool',
  isOwner: true,
  run: async (sock: any, m: any, { args, prefix }: any) => {
    const type = args?.[0]?.trim()?.toLowerCase()

    if (!type) {
      await m.reply(
        `*Uso:* ${prefix}delc <tipo>\n\n` +
        `*Tipos:*\n` +
        `→ \`dead\` — Eliminar cookies muertas\n` +
        `→ \`all\` — Eliminar todas las cookies\n` +
        `→ \`dup\` — Eliminar duplicadas\n` +
        `→ \`c<número>\` — Eliminar por ID (ej: c1)`
      )
      return
    }

    // Delete by specific ID
    if (type.startsWith('c') && type.length > 1) {
      const deleted = deleteCookieById(type)
      if (!deleted) {
        await m.reply(`❌ Cookie *${type}* no encontrada en el pool.`)
        return
      }
      await m.reply(`✅ Cookie *${type}* eliminada del pool.`)
      return
    }

    // Delete by type
    if (!['dead', 'all', 'dup'].includes(type)) {
      await m.reply(`❌ Tipo inválido: *${type}*\n\nUsa \`dead\`, \`all\`, \`dup\` o un ID como \`c1\`.`)
      return
    }

    const deleted = deleteCookies(type as 'dead' | 'all' | 'dup')

    if (deleted === 0) {
      const typeNames: { [k: string]: string } = { dead: 'muertas', all: '', dup: 'duplicadas' }
      await m.reply(`No se encontraron cookies ${typeNames[type]} para eliminar.`)
      return
    }

    const typeNames: { [k: string]: string } = { dead: 'muertas', all: 'totales', dup: 'duplicadas' }
    await m.reply(`✅ *${deleted}* cookies ${typeNames[type]} eliminadas del pool.`)
  },
}
