import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconShieldLock } from '@tabler/icons-react'
import { restMeuPapel } from '../services/supabase/rest'

/**
 * Atalho discreto para o painel admin, no canto do header. Só aparece para a
 * equipe (papel != user). Checagem via REST — não puxa o SDK no Radar.
 */
export function AdminShortcut() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    let vivo = true
    restMeuPapel().then((papel) => vivo && setOk(papel !== 'user'))
    return () => {
      vivo = false
    }
  }, [])
  if (!ok) return null
  return (
    <Link
      to="/admin"
      aria-label="Painel administrativo"
      title="Painel administrativo"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
        borderRadius: 12,
        color: '#fff',
        textDecoration: 'none',
        background: 'rgba(255,255,255,0.16)',
        border: '1px solid rgba(255,255,255,0.24)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <IconShieldLock size={20} stroke={2} />
    </Link>
  )
}
