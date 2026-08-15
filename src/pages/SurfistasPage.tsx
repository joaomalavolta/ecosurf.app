import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconSearch, IconX, IconUsers } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { SkeletonLinha } from '../components/Skeleton'
import { restListarSurfistas, filtrarSurfistas, type SurfistaResumo } from '../services/usuarios'

/**
 * Diretório de Ecosurfistas — o jeito de achar outras pessoas na rede.
 *
 * Grade de avatares (varredura rápida, como a faixa do Explorar) com busca
 * por nome ou cidade. Toca e vai pro perfil público.
 */
export function SurfistasPage() {
  const [todos, setTodos] = useState<SurfistaResumo[] | null>(null)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    let vivo = true
    restListarSurfistas().then((us) => vivo && setTodos(us))
    return () => { vivo = false }
  }, [])

  const resultado = useMemo(() => filtrarSurfistas(todos ?? [], busca), [todos, busca])

  return (
    <div className="page">
      <Header title="Ecosurfistas" sub="Encontre quem faz a rede acontecer." />
      <div className="page-pad">
        {/* Busca por nome ou cidade */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <IconSearch size={17} stroke={2} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            className="input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cidade…"
            style={{ paddingLeft: 40, paddingRight: busca ? 40 : 14 }}
            aria-label="Buscar surfista por nome ou cidade"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 6 }}
            >
              <IconX size={16} stroke={2} />
            </button>
          )}
        </div>

        {todos === null ? (
          <><SkeletonLinha /><SkeletonLinha /><SkeletonLinha /></>
        ) : resultado.length === 0 ? (
          <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <IconUsers size={30} stroke={1.5} style={{ color: 'var(--muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>
              {busca ? 'Ninguém encontrado' : 'Ainda não há surfistas por aqui'}
            </p>
            <p className="muted">
              {busca
                ? `Nada para “${busca.trim()}”. Tente outro nome ou cidade.`
                : 'Quem entrar na rede e escolher um nome aparece aqui.'}
            </p>
          </div>
        ) : (
          <>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>
              {resultado.length} {resultado.length === 1 ? 'surfista' : 'surfistas'}
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(86px, 1fr))', gap: 14 }}>
              {resultado.map((u) => (
                <Link
                  key={u.id}
                  to={`/usuario/${u.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center' }}
                >
                  {u.fotoUrl ? (
                    <img
                      src={u.fotoUrl}
                      alt=""
                      loading="lazy"
                      style={{ width: 64, height: 64, borderRadius: 99, objectFit: 'cover', margin: '0 auto', display: 'block' }}
                    />
                  ) : (
                    <span style={{ width: 64, height: 64, borderRadius: 99, background: 'color-mix(in srgb, var(--turq) 18%, transparent)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 22, color: 'var(--turq)', margin: '0 auto' }}>
                      {(u.nome ?? '?')[0]?.toUpperCase()}
                    </span>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.nome ?? 'Surfista'}
                  </div>
                  {u.cidade && (
                    <div className="muted" style={{ fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.cidade}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
