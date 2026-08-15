import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBell } from '@tabler/icons-react'
import { restContadores } from '../services/contadores'

/**
 * Sino do cabeçalho: o único lugar do app que diz "tem coisa nova".
 *
 * O número vem da mesma consulta que alimenta o selo de mensagens (uma view
 * com os dois contadores), então o sino não custa requisição extra. Some
 * inteiro para quem não está logado — visitante não tem aviso.
 */
export function SinoAvisos({ logado }: { logado: boolean }) {
  const [novas, setNovas] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!logado) return
    let vivo = true
    restContadores().then((c) => vivo && setNovas(c.notificacoes)).catch(() => {})
    return () => { vivo = false }
  }, [logado])

  if (!logado) return null

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => navigate('/avisos')}
        aria-label={novas > 0 ? `Avisos (${novas} novos)` : 'Avisos'}
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.08)',
          background: 'rgba(255,255,255,0.16)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        <IconBell size={19} stroke={2} />
      </button>
      {novas > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 17,
            height: 17,
            padding: '0 4px',
            borderRadius: 99,
            background: 'var(--coral)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            display: 'grid',
            placeItems: 'center',
            border: '2px solid var(--bg)',
            pointerEvents: 'none',
          }}
        >
          {novas > 9 ? '9+' : novas}
        </span>
      )}
    </div>
  )
}
