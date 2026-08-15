import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconMessageCircle, IconUsers } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { AvatarPessoa } from '../components/AvatarPessoa'
import { SkeletonLinha } from '../components/Skeleton'
import { restMinhaConta } from '../services/conta'
import { tempoCurto } from '../lib/conversa'
import type { Conversa } from '../services/mensagens'

/**
 * Caixa de entrada — as conversas privadas, mais recentes primeiro.
 *
 * Sem realtime por ora: recarrega ao abrir e ao voltar para a aba. É o
 * suficiente para o ritmo de uma rede de surfistas, e o custo é uma consulta
 * por visita em vez de uma conexão aberta o tempo todo.
 */
export function MensagensPage() {
  const [conversas, setConversas] = useState<Conversa[] | null>(null)
  const [logado, setLogado] = useState<boolean | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      const { listarConversas, esquecerSeloNaoLidas } = await import('../services/mensagens')
      esquecerSeloNaoLidas()
      setConversas(await listarConversas())
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar suas conversas.')
      setConversas([])
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

  // Voltou para a aba? Confere se chegou coisa nova.
  useEffect(() => {
    const aoVoltar = () => { if (document.visibilityState === 'visible' && logado) carregar() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [carregar, logado])

  return (
    <div className="page">
      <Header title="Mensagens" sub="Suas conversas privadas." />
      <div className="page-pad">
        {logado === false ? (
          <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <IconMessageCircle size={30} stroke={1.5} style={{ color: 'var(--muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>Entre para conversar</p>
            <p className="muted">As mensagens são privadas: só você e a outra pessoa leem.</p>
            <Link to="/perfil" className="btn acento" style={{ marginTop: 14, display: 'inline-flex' }}>
              Entrar na conta
            </Link>
          </div>
        ) : conversas === null ? (
          <><SkeletonLinha /><SkeletonLinha /><SkeletonLinha /></>
        ) : conversas.length === 0 ? (
          <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <IconMessageCircle size={30} stroke={1.5} style={{ color: 'var(--muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>
              {erro ? 'Não deu para carregar' : 'Nenhuma conversa ainda'}
            </p>
            <p className="muted">
              {erro ?? 'Abra o perfil de alguém e toque em “Mensagem” para começar.'}
            </p>
            {!erro && (
              <Link to="/surfistas" className="btn outline" style={{ marginTop: 14, display: 'inline-flex', gap: 6 }}>
                <IconUsers size={16} stroke={2} /> Ver Ecosurfistas
              </Link>
            )}
          </div>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {conversas.map((c) => (
              <Link
                key={c.id}
                to={`/mensagens/${c.id}`}
                className="card pad"
                style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}
              >
                <AvatarPessoa nome={c.outroNome} fotoUrl={c.outroFoto} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: c.naoLidas > 0 ? 800 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.outroNome ?? 'Surfista'}
                    </span>
                    <span className="muted" style={{ fontSize: 11, marginLeft: 'auto', flex: '0 0 auto' }}>
                      {tempoCurto(c.ultimaEm)}
                    </span>
                  </div>
                  <div
                    className={c.naoLidas > 0 ? undefined : 'muted'}
                    style={{ fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: c.naoLidas > 0 ? 600 : 400 }}
                  >
                    {c.ultimaMensagem ?? 'Conversa aberta — diga oi.'}
                  </div>
                </div>
                {c.naoLidas > 0 && (
                  <span
                    aria-label={`${c.naoLidas} não lidas`}
                    style={{ flex: '0 0 auto', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: 'var(--turq)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}
                  >
                    {c.naoLidas > 9 ? '9+' : c.naoLidas}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
