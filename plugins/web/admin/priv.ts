export default {
  command: ['priv'],
  description: 'Habilita que el bot responda en chat privado',
  isOwner: true,
  run: async (sock: any, m: any) => {
    global.db.settings['priv_enabled'] = { value: 'true' }
    await m.reply('✅ *Chat privado habilitado*\n\nEl bot ahora responderá mensajes privados.')
  },
}
