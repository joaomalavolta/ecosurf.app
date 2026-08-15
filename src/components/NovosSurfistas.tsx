import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconUserPlus } from '@tabler/icons-react'
import { restNovosSurfistas, type SurfistaResumo } from '../services/usuarios'

/**
 * Faixa horizontal de surfistas recém-chegados — um jeito de conhecer quem
 * entrou na rede. Toca no avatar e vai pro perfil. Some se não houver ninguém.
 */
export function NovosSurfistas() {
  const [us, setUs] = useState<SurfistaResumo[]>([])
  useEffect(() => {
    let vivo = true
    restNovosSurfistas(16).then((u) => vivo && setUs(u))
    return () => {
      vivo = false
    }
  }, [])
  if (us.length === 0) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <IconUserPlus size={13} stroke={2} /> Novos Ecosurfistas
        </span>
        {/* A faixa mostra os recém-chegados; o diretório tem todo mundo. */}
        <Link to="/surfistas" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--turq)', textDecoration: 'none' }}>
          Ver todos →
        </Link>
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {us.map((u) => (
          <Link
            key={u.id}
            to={`/usuario/${u.id}`}
            style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', flex: '0 0 auto', width: 64 }}
          >
            {u.fotoUrl ? (
              <img src={u.fotoUrl} alt="" style={{ width: 52, height: 52, borderRadius: 99, objectFit: 'cover' }} />
            ) : (
              <span style={{ width: 52, height: 52, borderRadius: 99, background: 'color-mix(in srgb, var(--turq) 18%, transparent)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--turq)', margin: '0 auto' }}>
                {(u.nome ?? '?')[0]?.toUpperCase()}
              </span>
            )}
            <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.nome ?? 'Surfista'}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
