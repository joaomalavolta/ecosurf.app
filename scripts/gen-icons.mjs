// Gera a imagem de compartilhamento (OG 1200×630) compondo o símbolo branco
// (public/icon_ecosurf.png) sobre o azul-abissal da marca. Rodar: node scripts/gen-icons.mjs
// O ícone de instalação/atalho é public/atalho_icone_celular.png (enviado pela marca).
import sharp from 'sharp'

const SIMBOLO = 'public/icon_ecosurf.png'
const BG = { r: 12, g: 42, b: 67, alpha: 1 } // #0C2A43
const TRANSP = { r: 0, g: 0, b: 0, alpha: 0 }

const sym = await sharp(SIMBOLO).resize(360, 360, { fit: 'contain', background: TRANSP }).toBuffer()
await sharp({ create: { width: 1200, height: 630, channels: 4, background: BG } })
  .composite([{ input: sym, gravity: 'center' }])
  .png()
  .toFile('public/og.png')
console.log('og.png gerado')
