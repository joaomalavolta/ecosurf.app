import { useState } from 'react'

/**
 * Logo do Ecosurf no header (sobre o gradiente escuro — logo branca brilha).
 * Coloque o arquivo em `public/logo.svg` (ou `public/logo.png`). Enquanto não
 * existir, cai no wordmark em texto.
 */
export function Brand({ height = 30 }: { height?: number }) {
  const [src, setSrc] = useState('/logo.svg')
  const [erro, setErro] = useState(false)

  if (erro) {
    return (
      <span
        style={{
          fontFamily: 'var(--fonte-titulo)',
          fontWeight: 700,
          fontSize: Math.round(height * 0.82),
          color: '#fff',
          letterSpacing: '-0.02em',
        }}
      >
        Ecosurf
      </span>
    )
  }

  return (
    <img
      src={src}
      alt="Ecosurf"
      style={{ height, width: 'auto', display: 'block', maxWidth: '78%' }}
      onError={() => (src.endsWith('.svg') ? setSrc('/logo.png') : setErro(true))}
    />
  )
}
