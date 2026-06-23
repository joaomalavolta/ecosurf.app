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
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
      <svg width={Math.round(height * 1.45)} height={height} viewBox="0 0 58 40" fill="none" style={{ filter: 'drop-shadow(0 4px 12px rgba(31,227,200,.35))' }}>
        <path d="M3 24c4 0 5-13 11-13s7 18 12 18 6-23 13-23 6 16 11 16" stroke="#1FE3C8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontSize: Math.round(height * 0.95), fontWeight: 800, letterSpacing: '-0.03em', color: '#fff' }}>
        eco<b style={{ color: 'var(--turq)', fontWeight: 800 }}>surf</b>
      </span>
    </div>
  )
}
