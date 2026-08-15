import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconSend, IconLock } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { AvatarPessoa } from '../components/AvatarPessoa'
import { agruparPorDia, horaMin, mesmaLista } from '../lib/conversa'
import type { Mensagem } from '../services/mensagens'

type Outro = { id: string; nome: string | null; fotoUrl: string | null }

/**
 * Uma conversa privada.
 *
 * Recarrega ao abrir, ao voltar para a aba e a cada 12s enquanto a tela está
 * visível — sem realtime, sem conexão aberta. O sigilo não depende desta tela:
 * a RLS só entrega mensagens de quem participa da conversa.
 */
export function ConversaPage() {
  const { conversaId } = useParams<{ conversaId: string }>()
  const [msgs, setMsgs] = useState<Mensagem[] | null>(null)
  // undefined = ainda buscando; null = conversa que não é minha (ou sem sessão).
  const [outro, setOutro] = useState<Outro | null | undefined>(undefined)
  const [eu, setEu] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fim = useRef<HTMLDivElement>(null)
  const ultimoVisto = useRef<string | null>(null)
  // Espelho da lista para comparar consultas sem depender do ciclo de render.
  const lista = useRef<Mensagem[] | null>(null)

  const recarregar = useCallback(async () => {
    if (!conversaId) return
    try {
      const { carregarMensagens, marcarLida, esquecerSeloNaoLidas } = await import('../services/mensagens')
      const novas = await carregarMensagens(conversaId)
      // Só redesenha e grava leitura quando algo de fato chegou — a tela
      // reconsulta a cada 12s e não faz sentido escrever no banco à toa.
      if (!mesmaLista(lista.current, novas)) {
        lista.current = novas
        setMsgs(novas)
        await marcarLida(conversaId)
        esquecerSeloNaoLidas()
      }
      setErro(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar a conversa.')
      if (!lista.current) setMsgs([])
    }
  }, [conversaId])

  useEffect(() => {
    if (!conversaId) return
    let vivo = true
    import('../services/mensagens').then(({ outroParticipante }) =>
      outroParticipante(conversaId).then((o) => vivo && setOutro(o)),
    ).catch(() => vivo && setOutro(null))
    import('../services/supabase/client').then(({ sb }) =>
      sb().auth.getSession().then(({ data }) => vivo && setEu(data.session?.user?.id ?? null)),
    ).catch(() => {})
    recarregar()
    return () => { vivo = false }
  }, [conversaId, recarregar])

  // Enquanto a tela está aberta e visível, confere de tempos em tempos.
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') recarregar() }
    const id = window.setInterval(tick, 12_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [recarregar])

  /**
   * Desce até o fim quando chega mensagem nova — e SÓ então. Sem essa
   * condição, cada reconsulta arrancaria de volta quem subiu para reler.
   */
  useEffect(() => {
    if (!msgs || msgs.length === 0) return
    const ultimo = msgs[msgs.length - 1].id
    if (ultimo === ultimoVisto.current) return
    const primeira = ultimoVisto.current === null
    ultimoVisto.current = ultimo
    fim.current?.scrollIntoView({ block: 'end', behavior: primeira ? 'auto' : 'smooth' })
  }, [msgs])

  async function enviar(e?: { preventDefault: () => void }) {
    e?.preventDefault()
    const corpo = texto.trim()
    if (!corpo || !conversaId || enviando) return
    setEnviando(true)
    setErro(null)
    try {
      const { enviarMensagem, esquecerSeloNaoLidas } = await import('../services/mensagens')
      const nova = await enviarMensagem(conversaId, corpo)
      lista.current = [...(lista.current ?? []), nova]
      setMsgs(lista.current)
      esquecerSeloNaoLidas()
      setTexto('')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar.')
    } finally {
      setEnviando(false)
    }
  }

  const grupos = agruparPorDia(msgs ?? [])
  // Sem o outro lado, ou não é minha conversa ou não há sessão — a RLS não
  // entrega nada e escrever também não iria adiantar.
  const semAcesso = outro === null

  if (semAcesso) {
    return (
      <div className="page">
        <Header title="Conversa" sub="Indisponível" />
        <div className="page-pad">
          <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
            <IconLock size={30} stroke={1.5} style={{ color: 'var(--muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px' }}>Esta conversa não está disponível</p>
            <p className="muted">Ou ela não é sua, ou você precisa entrar na conta.</p>
            <Link to="/mensagens" className="btn outline" style={{ marginTop: 14, display: 'inline-flex' }}>
              Ver minhas mensagens
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <Header title={outro?.nome ?? 'Conversa'} sub="Mensagem privada">
        {outro && (
          <Link
            to={`/usuario/${outro.id}`}
            style={{ display: 'inline-block', marginTop: 8, marginLeft: 56, fontSize: 12, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 99, padding: '4px 12px', textDecoration: 'none' }}
          >
            Ver perfil
          </Link>
        )}
      </Header>

      <div className="page-pad" style={{ paddingBottom: 108 }}>
        {msgs === null ? (
          <p className="muted" style={{ textAlign: 'center', marginTop: 24 }}>Carregando conversa…</p>
        ) : msgs.length === 0 ? (
          <div className="card pad" style={{ textAlign: 'center', padding: '26px 16px' }}>
            <AvatarPessoa nome={outro?.nome ?? null} fotoUrl={outro?.fotoUrl ?? null} tamanho={56} />
            <p style={{ fontSize: 15, fontWeight: 600, margin: '10px 0 4px' }}>
              {erro ? 'Não deu para carregar' : 'Conversa nova'}
            </p>
            <p className="muted">
              {erro ?? `Escreva a primeira mensagem para ${outro?.nome ?? 'essa pessoa'}.`}
            </p>
          </div>
        ) : (
          grupos.map((g) => (
            <div key={g.chave}>
              <div style={{ textAlign: 'center', margin: '14px 0 10px' }}>
                <span className="muted" style={{ fontSize: 11, fontWeight: 700, background: 'var(--chip-bg)', borderRadius: 99, padding: '3px 10px' }}>
                  {g.rotulo}
                </span>
              </div>
              <div className="stack" style={{ gap: 6 }}>
                {g.itens.map((m) => {
                  const minha = m.autorId === eu
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: minha ? 'flex-end' : 'flex-start' }}>
                      <div
                        style={{
                          maxWidth: '78%',
                          padding: '8px 12px',
                          borderRadius: 16,
                          borderBottomRightRadius: minha ? 5 : 16,
                          borderBottomLeftRadius: minha ? 16 : 5,
                          background: minha ? 'var(--turq)' : 'var(--card)',
                          color: minha ? '#fff' : 'var(--text)',
                          border: minha ? 0 : '1px solid var(--line)',
                        }}
                      >
                        <div style={{ fontSize: 14.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {m.corpo}
                        </div>
                        <div style={{ fontSize: 10.5, marginTop: 3, textAlign: 'right', opacity: minha ? 0.85 : 0.6 }}>
                          {horaMin(new Date(m.criadaEm))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {erro && msgs && msgs.length > 0 && (
          <p style={{ color: 'var(--coral)', fontSize: 12.5, textAlign: 'center', marginTop: 10 }}>{erro}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 16 }}>
          <IconLock size={12} stroke={2} style={{ color: 'var(--muted)' }} />
          <span className="muted" style={{ fontSize: 11 }}>Só você e {outro?.nome ?? 'a outra pessoa'} leem esta conversa.</span>
        </div>

        <div ref={fim} />
      </div>

      {/* Campo de escrita: fixo no rodapé (a barra de navegação some aqui). */}
      <form
        onSubmit={enviar}
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 0,
          width: '100%',
          maxWidth: 'var(--largura-app)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          padding: '10px 12px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--nav-line)',
          zIndex: 50,
        }}
      >
        <textarea
          className="input"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter quebra linha; Ctrl/Cmd+Enter envia (atalho de teclado físico).
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) enviar(e)
          }}
          placeholder="Escreva uma mensagem…"
          rows={1}
          maxLength={4000}
          aria-label="Escreva uma mensagem"
          style={{ flex: 1, resize: 'none', minHeight: 42, maxHeight: 120, paddingTop: 11, paddingBottom: 11, lineHeight: 1.35 }}
        />
        <button
          type="submit"
          className="btn acento"
          disabled={!texto.trim() || enviando}
          aria-label="Enviar mensagem"
          style={{ flex: '0 0 auto', height: 42, opacity: !texto.trim() || enviando ? 0.5 : 1 }}
        >
          <IconSend size={17} stroke={2} />
        </button>
      </form>
    </div>
  )
}
