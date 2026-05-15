export default {
  command: ['glist'],
  description: 'Lista los grupos autorizados',
  isOwner: true,
  run: async (sock: any, m: any) => {
    const chats = global.db.chats
    const authorizedGroups = Object.entries(chats)
      .filter(([id, data]: [string, any]) => id.endsWith('@g.us') && data.authorized)

    if (!authorizedGroups.length) {
      return m.reply('📋 No hay grupos autorizados.\n\nUsa *.gp* en un grupo para autorizarlo.')
    }

    let msg = `📋 *GRUPOS AUTORIZADOS (${authorizedGroups.length})*\n\n`

    for (const [id, data] of authorizedGroups) {
      const metadata = await sock.groupMetadata(id).catch(() => null)
      const name = metadata?.subject || 'Grupo desconocido'
      const members = metadata?.participants?.length || '?'
      msg += `☁️ *${name}*\n`
      msg += `   🆔 ${id}\n`
      msg += `   👥 ${members} miembros\n\n`
    }

    await sock.sendMessage(m.chat, { text: msg.trim() }, { quoted: m })
  },
}
