import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { IconShieldCheck, IconPencil, IconEye, IconShare2 } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { SkeletonLinha } from '../components/Skeleton'
import { toast } from '../lib/toast'
import {
  carregarComunidade, listarMembros, definirPapel, meuPapel,
  type Comunidade, type PapelComunidade,
} from '../services/comunidades'

const PAPEIS: { id: PapelComunidade; label: string; desc: string; Icone: typeof IconEye }[] = [
  { id: 'admin', label: 'Admin', desc: 'Gerencia e publica', Icone: IconShieldCheck },
  { id: 'autor', label: 'Autor', desc: 'Publica em nome da comunidade', Icone: IconPencil },
  { id: 'seguidor', label: 'Seguidor', desc: 'Acompanha as publicações', Icone: IconEye },
]

/**
 * Gestão da comunidade (só admin): promove seguidores a co-autores — o
 * coração da opção B, que permite ao coletivo publicar a várias mãos.
 */
export function GerenciarComunidadePage() {
  const { comunidadeId } = useParams<{ comunidadeId: string }>()
  const navigate = useNavigate()
  const [c, setC] = useState<Comunidade | null>(null)
  const [membros, setMembros] = useState<{ usuarioId: string; nome: string; avatar?: string; papel: PapelComunidade }[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (!comunidadeId) return
    let vivo = true
    void (async () => {
      const p = await meuPapel(comunidadeId)
      if (!vivo) return
      if (p !== 'admin') {
        toast('Só administradores gerenciam a comunidade.')
        navigate(`/comunidade/${comunidadeId}`)
        return
      }
      const [com, ms] = await Promise.all([carregarComunidade(comunidadeId), listarMembros(comunidadeId)])
      if (!vivo) return
      setC(com)
      setMembros(ms)
      setCarregando(false)
    })()
    return () => { vivo = false }
  }, [comunidadeId, navigate])

  async function mudarPapel(usuarioId: string, papel: PapelComunidade) {
    if (!comunidadeId) return
    const antes = membros
    setMembros((ms) => ms.map((m) => m.usuarioId === usuarioId ? { ...m, papel } : m))
    try {
      await definirPapel(comunidadeId, usuarioId, papel)
      toast('Papel atualizado.', 'sucesso')
    } catch {
      setMembros(antes)
      toast('Não foi possível atualizar o papel.')
    }
  }

  function convidar() {
    const url = `${window.location.origin}/comunidade/${comunidadeId}`
    const texto = `Participe da comunidade ${c?.nome} no Ecosurf`
    if (navigator.share) navigator.share({ title: c?.nome, text: texto, url }).catch(() => {})
    else window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`, '_blank')
  }

  return (
    <div className="page">
      <Header title="Gerenciar" sub={c?.nome} />
      <div className="page-pad">
        <button className="btn acento full" onClick={convidar}>
          <IconShare2 size={17} stroke={2} /> Convidar pessoas
        </button>

        <span className="eyebrow" style={{ display: 'block', margin: '20px 0 10px' }}>
          Membros ({membros.length})
        </span>

        {carregando ? (
          <><SkeletonLinha /><SkeletonLinha /></>
        ) : (
          <div className="stack">
            {membros.map((m) => (
              <div key={m.usuarioId} className="card pad">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {m.avatar
                    ? <img src={m.avatar} alt="" style={{ width: 38, height: 38, borderRadius: 99, objectFit: 'cover' }} />
                    : <span style={{ width: 38, height: 38, borderRadius: 99, background: 'color-mix(in srgb, var(--turq) 18%, transparent)', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--turq)' }}>{m.nome[0]?.toUpperCase()}</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.nome}</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      {PAPEIS.find((p) => p.id === m.papel)?.desc}
                    </div>
                  </div>
                </div>

                {/* Seletor de papel */}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {PAPEIS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => m.papel !== p.id && void mudarPapel(m.usuarioId, p.id)}
                      disabled={m.usuarioId === c?.criadorId}
                      style={{
                        flex: 1, padding: '7px 6px', borderRadius: 10, cursor: m.usuarioId === c?.criadorId ? 'default' : 'pointer',
                        border: m.papel === p.id ? '1.5px solid var(--turq)' : '1px solid var(--line)',
                        background: m.papel === p.id ? 'color-mix(in srgb, var(--turq) 10%, transparent)' : 'transparent',
                        color: m.papel === p.id ? 'var(--turq)' : 'var(--muted)',
                        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        opacity: m.usuarioId === c?.criadorId && m.papel !== p.id ? 0.4 : 1,
                      }}
                    >
                      <p.Icone size={13} stroke={2} /> {p.label}
                    </button>
                  ))}
                </div>
                {m.usuarioId === c?.criadorId && (
                  <p className="muted" style={{ fontSize: 10.5, marginTop: 6 }}>
                    Fundador — o papel não pode ser alterado.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
