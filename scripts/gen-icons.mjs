// Gera ícones do PWA + apple-touch + OG a partir do símbolo (branco/transparente)
// compondo sobre o azul-abissal da marca. Rodar: node scripts/gen-icons.mjs
// Os PNGs ficam em public/ e são versionados (a CI não precisa rodar isto).
import sharp from 'sharp'

const SIMBOLO = 'public/icon_ecosurf.png'
const BG = { r: 12, g: 42, b: 67, alpha: 1 } // #0C2A43
const TRANSP = { r: 0, g: 0, b: 0, alpha: 0 }

async function quadrado(size, pad) {
  const inner = Math.round(size * (1 - pad))
  const sym = await sharp(SIMBOLO).resize(inner, inner, { fit: 'contain', background: TRANSP }).toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: sym, gravity: 'center' }])
    .png()
    .toFile(`public/${size === 180 ? 'apple-touch-icon' : `icon-${size}`}.png`)
}

async function og() {
  const sym = await sharp(SIMBOLO).resize(360, 360, { fit: 'contain', background: TRANSP }).toBuffer()
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: BG } })
    .composite([{ input: sym, gravity: 'center' }])
    .png()
    .toFile('public/og.png')
}

await quadrado(512, 0.3)
await quadrado(192, 0.3)
await quadrado(180, 0.26)
await og()
console.log('ícones + og gerados')
