export default {
  command: ['gp'],
  description: 'Autoriza al bot a funcionar en este grupo',
  isOwner: true,
  run: async (sock: any, m: any) => {
    if (!m.isGroup) return m.reply('⚠️ Este comando solo funciona en grupos.')

    const groupId = m.chat
    const chatData = global.db.chats[groupId] || {}
    chatData.authorized = true
    global.db.chats[groupId] = chatData

    const metadata = await sock.groupMetadata(groupId).catch(() => null)
    const name = metadata?.subject || 'Grupo'

    await sock.sendMessage(m.chat, {
      text: `✅ *Grupo autorizado*\n\n☁️ ${name}\n🆔 ${groupId}\n\nEl bot ahora responderá en este grupo.`,
    }, { quoted: m })
  },
}
