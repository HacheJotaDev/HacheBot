export default {
  command: ['unpriv'],
  description: 'Deshabilita que el bot responda en chat privado',
  isOwner: true,
  run: async (sock: any, m: any) => {
    global.db.settings['priv_enabled'] = { value: 'false' }
    await m.reply('🚫 *Chat privado deshabilitado*\n\nEl bot ya no responderá mensajes privados.')
  },
}
