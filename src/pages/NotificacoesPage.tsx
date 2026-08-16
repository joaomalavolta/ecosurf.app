import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconBell, IconMessageCircle, IconUsersGroup, IconSpeakerphone, IconX, IconChecks, IconInfoCircle } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { AvatarPessoa } from '../components/AvatarPessoa'
import { SkeletonLinha } from '../components/Skeleton'
import { restMinhaConta } from '../services/conta'
import { tempoCurto } from '../lib/conversa'
import type { Notificacao, TipoNotificacao } from '../services/notificacoes'

const ICONE: Record<TipoNotificacao, typeof IconBell> = {
  mensagem: IconMessageCircle,
  comunidade_membro: IconUsersGroup,
  comunidade_publicacao: IconSpeakerphone,
  sistema: IconInfoCircle,
}

/**
 * O que aconteceu enquanto você não estava.
 *
 * O push toca e some; aqui fica o registro. Abrir a tela não marca tudo como
 * lido de propósito — quem olhou de relance e saiu não perde o rastro. Marcar
 * é um gesto: o botão no topo, ou tocar no aviso.
 */
export function NotificacoesPage() {
  const [itens, setItens] = useState<Notificacao[] | null>(null)
  const [logado, setLogado] = useState<boolean | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const { listarNotificacoes } = await import('../services/notificacoes')
      setItens(await listarNotificacoes())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar seus avisos.')
      setItens([])
    }
  }, [])

  useEffect(() => {
    let vivo = true
    restMinhaConta().then((c) => {
      if (!vivo) return
      setLogado(!!c.id)
      if (c.id) carregar()
    })
    return () => { vivo = false }
  }, [carregar])

  async function lerTudo() {
    const { marcarLidas } = await import('../services/notificacoes')
    await marcarLidas().catch(() => {})
    const agora = new Date().toISOString()
    setItens((ns) => (ns ?? []).map((n) => (n.lidaEm ? n : { ...n, lidaEm: agora })))
  }

  async function marcarUma(id: string) {
    const { marcarLidas } = await import('../services/notificacoes')
    await marcarLidas([id]).catch(() => {})
  }

  async function remover(id: string) {
    const { dispensar } = await import('../services/notificacoes')
    setItens((ns) => (ns ?? []).filter((n) => n.id !== id))
    await dispensar(id).catch(() => carregar())
  }

  const novas = (itens ?? []).filter((n) => !n.lidaEm).length

  return (
    <div className="page">
      <Header title="Avisos" sub="O que aconteceu enquanto você não estava." />
      <div className="page-pad">
        {logado === false ? (
          <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <IconBell size={30} stroke={1.5} style={{ color: 'var(--muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>Entre para ver seus avisos</p>
            <p className="muted">Mensagens e movimento nas suas comunidades aparecem aqui.</p>
            <Link to="/perfil" className="btn acento" style={{ marginTop: 14, display: 'inline-flex' }}>
              Entrar na conta
            </Link>
          </div>
        ) : itens === null ? (
          <><SkeletonLinha /><SkeletonLinha /><SkeletonLinha /></>
        ) : itens.length === 0 ? (
          <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <IconBell size={30} stroke={1.5} style={{ color: 'var(--muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>
              {erro ? 'Não deu para carregar' : 'Nada por aqui ainda'}
            </p>
            <p className="muted">
              {erro ?? 'Quando alguém te escrever ou sua comunidade se mexer, você fica sabendo aqui.'}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="eyebrow">
                {novas > 0 ? `${novas} ${novas === 1 ? 'novo' : 'novos'}` : 'Tudo em dia'}
              </span>
              {novas > 0 && (
                <button
                  onClick={lerTudo}
                  className="btn outline"
                  style={{ padding: '5px 11px', fontSize: 12, gap: 5 }}
                >
                  <IconChecks size={15} stroke={2} /> Marcar tudo como lido
                </button>
              )}
            </div>

            <div className="stack" style={{ gap: 8 }}>
              {itens.map((n) => {
                const Icone = ICONE[n.tipo] ?? IconBell
                const nova = !n.lidaEm
                return (
                  <div
                    key={n.id}
                    className="card pad"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      borderLeft: nova ? '3px solid var(--turq)' : '3px solid transparent',
                    }}
                  >
                    <Link
                      to={n.url ?? '/'}
                      onClick={() => nova && marcarUma(n.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
                    >
                      {n.atorId ? (
                        <AvatarPessoa nome={n.atorNome} fotoUrl={n.atorFoto} tamanho={40} />
                      ) : (
                        <span style={{ width: 40, height: 40, borderRadius: 99, background: 'var(--chip-bg)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
                          <Icone size={19} stroke={2} style={{ color: 'var(--muted)' }} />
                        </span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: nova ? 800 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.titulo}
                          </span>
                          <span className="muted" style={{ fontSize: 11, marginLeft: 'auto', flex: '0 0 auto' }}>
                            {tempoCurto(n.criadaEm)}
                          </span>
                        </div>
                        {n.corpo && (
                          <div className="muted" style={{ fontSize: 12.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <Icone size={12} stroke={2} style={{ verticalAlign: -1, marginRight: 4 }} />
                            {n.corpo}
                          </div>
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={() => remover(n.id)}
                      aria-label={`Dispensar aviso: ${n.titulo}`}
                      style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 6, flex: '0 0 auto' }}
                    >
                      <IconX size={16} stroke={2} />
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
