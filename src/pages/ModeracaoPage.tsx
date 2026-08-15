import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconPhoto, IconMessageReport, IconEyeOff, IconCheck, IconArchive } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { ehModerador, ocultarFoto } from '../services/moderacao'
import { listarDenuncias, resolverDenuncia, MOTIVOS_CONVERSA, type DenunciaItem } from '../services/denuncias'

const ROTULO_MOTIVO = new Map<string, string>(MOTIVOS_CONVERSA.map((m) => [m.id, m.rotulo]))

export function ModeracaoPage() {
  const [mod, setMod] = useState<boolean | null>(null)
  const [itens, setItens] = useState<DenunciaItem[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    ehModerador().then((m) => {
      if (!vivo) return
      setMod(m)
      if (m) listarDenuncias().then((d) => vivo && setItens(d)).catch(() => vivo && setItens([]))
    })
    return () => { vivo = false }
  }, [])

  async function ocultar(d: DenunciaItem) {
    if (!d.foto_id) return
    try {
      await ocultarFoto(d.foto_id)
      await resolverDenuncia(d.id, 'resolvida')
      setItens((xs) => xs.filter((x) => x.id !== d.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.')
    }
  }

  async function fechar(d: DenunciaItem, status: 'resolvida' | 'arquivada') {
    try {
      await resolverDenuncia(d.id, status)
      setItens((xs) => xs.filter((x) => x.id !== d.id))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.')
    }
  }

  return (
    <div className="page">
      <Header title="Moderação" sub="Denúncias da comunidade — veteranos da região." />
      <div className="page-pad stack">
        {mod === null && <p className="muted">Verificando acesso…</p>}

        {mod === false && (
          <div className="card pad">
            <b>Acesso restrito</b>
            <p className="muted">Esta área é para moderadores de região. Fale com a organização para se tornar um.</p>
            <Link to="/" className="btn" style={{ marginTop: 8 }}>Voltar ao radar</Link>
          </div>
        )}

        {erro && <p style={{ color: 'var(--coral)', fontSize: 13 }}>{erro}</p>}

        {mod && itens.length === 0 && <p className="muted">Sem denúncias pendentes.</p>}

        {mod && itens.map((d) => {
          const ehConversa = d.tipo === 'conversa'
          return (
            <div key={d.id} className="card pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                {ehConversa
                  ? <IconMessageReport size={15} stroke={2} style={{ color: 'var(--coral)' }} />
                  : <IconPhoto size={15} stroke={2} style={{ color: 'var(--turq)' }} />}
                <span className="eyebrow">{ehConversa ? 'Conversa' : 'Foto'}</span>
                <span className="muted" style={{ fontSize: 11.5, marginLeft: 'auto' }}>
                  {new Date(d.criada_em).toLocaleString('pt-BR')}
                </span>
              </div>

              {ehConversa ? (
                <>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                    {ROTULO_MOTIVO.get(d.motivo ?? '') ?? d.motivo ?? 'Sem motivo informado'}
                  </div>
                  {d.alvo_id && (
                    <Link to={`/usuario/${d.alvo_id}`} style={{ fontSize: 13, color: 'var(--turq)', fontWeight: 600, textDecoration: 'none' }}>
                      Denunciada: {d.alvo_nome ?? 'ver perfil'} →
                    </Link>
                  )}
                  {d.detalhe && (
                    <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: '6px 0 0' }}>“{d.detalhe}”</p>
                  )}
                  {/* O conteúdo da conversa não é exposto aqui: a RLS não entrega
                      mensagem de quem não participa, nem para moderador. */}
                  <p className="muted" style={{ fontSize: 11.5, margin: '8px 0 0' }}>
                    As mensagens não aparecem para a moderação — a decisão é sobre a
                    pessoa e o relato, não sobre ler conversa alheia.
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn outline" style={{ flex: 1, justifyContent: 'center', gap: 5 }} onClick={() => fechar(d, 'arquivada')}>
                      <IconArchive size={15} stroke={2} /> Arquivar
                    </button>
                    <button className="btn acento" style={{ flex: 1, justifyContent: 'center', gap: 5 }} onClick={() => fechar(d, 'resolvida')}>
                      <IconCheck size={15} stroke={2} /> Resolvida
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="muted" style={{ fontSize: 12 }}>foto {d.foto_id?.slice(0, 8) ?? '—'}</div>
                  <div style={{ margin: '6px 0' }}>{d.motivo || 'sem motivo informado'}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn outline" style={{ flex: 1, justifyContent: 'center', gap: 5 }} onClick={() => fechar(d, 'arquivada')}>
                      <IconArchive size={15} stroke={2} /> Arquivar
                    </button>
                    <button className="btn" style={{ flex: 1, justifyContent: 'center', gap: 5 }} onClick={() => ocultar(d)}>
                      <IconEyeOff size={15} stroke={2} /> Ocultar foto
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
