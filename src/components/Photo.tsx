import type { CSSProperties } from 'react'

/**
 * Placeholder de foto determinístico (gradiente de água) por enquanto.
 * Funciona offline e mantém a "foto" como peça visual. Trocar por <img>
 * do CDN (WebP/AVIF, srcset) quando o pipeline de mídia existir.
 */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function Photo({
  seed,
  url,
  alt,
  style,
}: {
  seed: string
  url?: string
  alt: string
  style?: CSSProperties
}) {
  if (url) {
    return <img src={url} alt={alt} loading="lazy" style={{ objectFit: 'cover', display: 'block', ...style }} />
  }
  const h = hash(seed)
  const a = 175 + (h % 35) // tons de água (cyan→teal)
  const b = 150 + ((h >> 4) % 40) // esverdeado
  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        background: `linear-gradient(155deg, hsl(${a} 65% 72%), hsl(${b} 48% 52%))`,
        ...style,
      }}
    />
  )
}
