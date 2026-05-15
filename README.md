# HacheBot

WhatsApp Bot construido con TypeScript y [Baileys](https://github.com/WhiskeySockets/Baileys).

## Requisitos

- Node.js 18+
- npm o pnpm
- ffmpeg (para stickers de video)

## Instalación

```bash
git clone https://github.com/HacheJotaDev/HacheBot.git
cd HacheBot
npm install
```

## Configuración

Edita `config.ts` con tu número de owner y dev:

```ts
const config = {
  owners: ['521234567890'],  // Tu número sin +
  devs: ['521234567890'],
  prefix: ['.', '!', '#'],
}
```

## Uso

```bash
# Desarrollo (hot reload)
npm run dev

# Producción
npm start
```

Al iniciar, el bot te pedirá tu número para generar un código de vinculación. Ingresa el código en WhatsApp > Dispositivos vinculados > Vincular con número.

## Comandos

| Categoría | Comando | Descripción |
|-----------|---------|-------------|
| General | `.ping` | Verifica la conexión |
| General | `.menu` | Muestra la lista de comandos |
| General | `.info` | Información del bot |
| Grupos | `.on/off welcome` | Activar/desactivar bienvenida |
| Grupos | `.on/off antilink` | Activar/desactivar anti-enlaces |
| Grupos | `.kick @user` | Expulsar miembro |
| Grupos | `.promote @user` | Dar admin |
| Grupos | `.demote @user` | Quitar admin |
| Grupos | `.hidetag texto` | Mencionar a todos |
| Stickers | `.sticker` | Crear sticker (responde a imagen/video) |
| Owner | `.listusers` | Ver usuarios registrados |
| Owner | `.update` | Actualizar desde GitHub |
| Dev | `.restart` | Reiniciar el bot |
| Dev | `.backup` | Respaldar credenciales |

## Estructura

```
HacheBot/
├── index.ts          # Punto de entrada - conexión WhatsApp
├── config.ts         # Configuración del bot
├── handler.ts        # Manejador de comandos
├── lib/
│   ├── simple.ts     # Parser de mensajes
│   ├── utils.ts      # Utilidades (resolución LID)
│   ├── stickers.ts   # Conversión a WebP + EXIF
│   └── db/
│       └── data.ts   # Base de datos SQLite
├── plugins/
│   ├── general/      # Comandos generales
│   ├── groups/       # Comandos de grupo
│   ├── owner/        # Comandos de owner
│   ├── dev/          # Comandos de desarrollador
│   ├── stickers/     # Comandos de stickers
│   ├── hj/           # Herramientas especiales
│   └── antilink.ts   # Anti-enlaces automático
├── a.sh              # Auto-push script
├── package.json
└── tsconfig.json
```

## Licencia

Uso privado.
