import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconCrown, IconShieldCheck, IconPencil, IconUsers } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { AvatarPessoa } from '../components/AvatarPessoa'
import { SkeletonLinha } from '../components/Skeleton'
import type { Comunidade, MembroPublico, PapelComunidade } from '../services/comunidades'

/** Selo do papel — quem fundou aparece primeiro e com destaque. */
function SeloPapel({ papel, fundador }: { papel: PapelComunidade; fundador: boolean }) {
  const [Icone, texto, cor] = fundador
    ? [IconCrown, 'Fundador', 'var(--amber)'] as const
    : papel === 'admin'
      ? [IconShieldCheck, 'Admin', 'var(--turq)'] as const
      : papel === 'autor'
        ? [IconPencil, 'Publica', 'var(--aqua)'] as const
        : [IconUsers, 'Segue', 'var(--muted)'] as const
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: cor }}>
      <Icone size={13} stroke={2} /> {texto}
    </span>
  )
}

/**
 * Quem faz parte da comunidade.
 *
 * Lista pública: dá para saber quem está junto antes de entrar. Tudo por
 * REST — ver os membros não exige sessão nem carrega o SDK.
 */
export function MembrosComunidadePage() {
  const { comunidadeId } = useParams<{ comunidadeId: string }>()
  const [membros, setMembros] = useState<MembroPublico[] | null>(null)
  const [comunidade, setComunidade] = useState<Comunidade | null>(null)

  useEffect(() => {
    if (!comunidadeId) return
    let vivo = true
    import('../services/comunidades').then(async ({ carregarComunidade, restMembros }) => {
      // O nome do fundador depende da comunidade, então ela vem primeiro.
      const c = await carregarComunidade(comunidadeId).catch(() => null)
      if (!vivo) return
      setComunidade(c)
      const ms = await restMembros(comunidadeId, c?.criadorId)
      if (vivo) setMembros(ms)
    }).catch(() => vivo && setMembros([]))
    return () => { vivo = false }
  }, [comunidadeId])

  return (
    <div className="page">
      <Header
        title="Membros"
        sub={comunidade ? `Quem faz parte de ${comunidade.nome}.` : 'Quem faz parte da comunidade.'}
      />
      <div className="page-pad">
        {membros === null ? (
          <><SkeletonLinha /><SkeletonLinha /><SkeletonLinha /></>
        ) : membros.length === 0 ? (
          <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <IconUsers size={30} stroke={1.5} style={{ color: 'var(--muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>Ainda sem membros</p>
            <p className="muted">Quem seguir a comunidade aparece aqui.</p>
          </div>
        ) : (
          <>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 10 }}>
              {membros.length} {membros.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
            <div className="stack" style={{ gap: 8 }}>
              {membros.map((m) => (
                <Link
                  key={m.usuarioId}
                  to={`/usuario/${m.usuarioId}`}
                  className="card pad"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}
                >
                  <AvatarPessoa nome={m.nome} fotoUrl={m.fotoUrl} tamanho={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.nome ?? 'Surfista'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <SeloPapel papel={m.papel} fundador={m.fundador} />
                      {m.cidade && (
                        <span className="muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.cidade}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
