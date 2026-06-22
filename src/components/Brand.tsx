import { useState } from 'react'

/**
 * Logo do Ecosurf no header (wordmark branco sobre o gradiente escuro).
 * Arquivo: public/logo_ecosurf.png. Cai no wordmark em texto se faltar.
 */
export function Brand({ height = 34 }: { height?: number }) {
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
      src="/logo_ecosurf.png"
      alt="Ecosurf"
      style={{ height, width: 'auto', display: 'block', maxWidth: '80%' }}
      onError={() => setErro(true)}
    />
  )
}
