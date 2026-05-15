export default {
  command: ['ungp'],
  description: 'Revoca el permiso del bot en este grupo',
  isOwner: true,
  run: async (sock: any, m: any) => {
    if (!m.isGroup) return m.reply('⚠️ Este comando solo funciona en grupos.')

    const groupId = m.chat
    const chatData = global.db.chats[groupId] || {}
    chatData.authorized = false
    global.db.chats[groupId] = chatData

    const metadata = await sock.groupMetadata(groupId).catch(() => null)
    const name = metadata?.subject || 'Grupo'

    await sock.sendMessage(m.chat, {
      text: `🚫 *Grupo desautorizado*\n\n☁️ ${name}\n🆔 ${groupId}\n\nEl bot ya no responderá en este grupo.`,
    }, { quoted: m })
  },
}
