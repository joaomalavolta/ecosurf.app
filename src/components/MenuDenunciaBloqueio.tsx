import { useEffect, useRef, useState } from 'react'
import { IconDots, IconBan, IconFlag, IconX, IconCheck } from '@tabler/icons-react'
import { MOTIVOS_CONVERSA } from '../services/denuncias'

type Aberto = null | 'menu' | 'denunciar' | 'bloquear'

/**
 * Bloquear e denunciar — a saída de quem recebe o que não pediu.
 *
 * Fica atrás de "⋯" de propósito: é raro, e ninguém precisa de um botão de
 * denúncia no caminho da conversa normal. Mas está sempre a um toque, que é
 * o que importa na hora em que se precisa.
 */
export function MenuDenunciaBloqueio({
  alvoId,
  alvoNome,
  conversaId,
  aoBloquear,
  variante = 'header',
}: {
  alvoId: string
  alvoNome: string | null
  conversaId?: string | null
  /** Chamado depois de bloquear — a tela decide se sai da conversa. */
  aoBloquear?: () => void
  /** 'header' = branco sobre o azul do topo; 'corpo' = contornado, no fundo claro. */
  variante?: 'header' | 'corpo'
}) {
  const [aberto, setAberto] = useState<Aberto>(null)
  const [motivo, setMotivo] = useState<string>(MOTIVOS_CONVERSA[0].id)
  const [detalhe, setDetalhe] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [feito, setFeito] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aberto !== 'menu') return
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(null)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  const nome = alvoNome ?? 'esta pessoa'

  async function confirmarDenuncia() {
    setOcupado(true)
    setErro(null)
    try {
      const { denunciarConversa } = await import('../services/denuncias')
      await denunciarConversa(alvoId, conversaId ?? null, motivo, detalhe)
      setAberto(null)
      setDetalhe('')
      setFeito('Denúncia enviada. A moderação vai analisar.')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível denunciar agora.')
    } finally {
      setOcupado(false)
    }
  }

  async function confirmarBloqueio() {
    setOcupado(true)
    setErro(null)
    try {
      const { bloquear } = await import('../services/bloqueios')
      await bloquear(alvoId)
      setAberto(null)
      setFeito(`${nome} foi bloqueada.`)
      aoBloquear?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível bloquear agora.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative', flex: '0 0 auto' }}>
      <button
        onClick={() => setAberto(aberto === 'menu' ? null : 'menu')}
        aria-label={`Opções sobre ${nome}`}
        aria-expanded={aberto === 'menu'}
        style={{
          width: variante === 'corpo' ? 42 : 34,
          height: variante === 'corpo' ? 42 : 34,
          borderRadius: variante === 'corpo' ? 12 : 10,
          cursor: 'pointer', display: 'grid', placeItems: 'center',
          ...(variante === 'corpo'
            ? { background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)' }
            : { background: 'rgba(255,255,255,.18)', border: 0, color: '#fff' }),
        }}
      >
        <IconDots size={18} stroke={2} />
      </button>

      {aberto === 'menu' && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 210,
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 'var(--raio)', boxShadow: 'var(--shadow)', zIndex: 70,
            overflow: 'hidden', padding: '6px 0',
          }}
        >
          <BotaoMenu icone={<IconFlag size={17} stroke={2} />} onClick={() => setAberto('denunciar')}>
            Denunciar
          </BotaoMenu>
          <BotaoMenu icone={<IconBan size={17} stroke={2} />} perigo onClick={() => setAberto('bloquear')}>
            Bloquear
          </BotaoMenu>
        </div>
      )}

      {(aberto === 'denunciar' || aberto === 'bloquear') && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.45)',
            display: 'grid', placeItems: 'end center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setAberto(null) }}
        >
          <div
            className="card pad"
            style={{
              width: '100%', maxWidth: 'var(--largura-app)', borderRadius: '18px 18px 0 0',
              padding: '18px 16px calc(18px + env(safe-area-inset-bottom, 0px))',
              animation: 'fadeSlideIn .18s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <strong style={{ fontSize: 16 }}>
                {aberto === 'bloquear' ? `Bloquear ${nome}?` : `Denunciar ${nome}`}
              </strong>
              <button onClick={() => setAberto(null)} aria-label="Fechar" style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
                <IconX size={18} stroke={2} />
              </button>
            </div>

            {aberto === 'bloquear' ? (
              <>
                <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.5, margin: '0 0 4px' }}>
                  Vocês não poderão mais trocar mensagens, e a conversa sai da sua caixa de entrada.
                </p>
                <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, margin: '0 0 14px' }}>
                  {nome} <b>não é avisada</b> de que foi bloqueada. Você pode desfazer quando quiser,
                  em Perfil → Pessoas bloqueadas.
                </p>
              </>
            ) : (
              <>
                <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: '0 0 12px' }}>
                  A moderação do Ecosurf vai analisar. {nome} não fica sabendo quem denunciou.
                </p>
                <div className="stack" style={{ gap: 6, marginBottom: 12 }}>
                  {MOTIVOS_CONVERSA.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMotivo(m.id)}
                      className="row"
                      style={{
                        background: motivo === m.id ? 'var(--chip-bg)' : 'none',
                        border: `1px solid ${motivo === m.id ? 'var(--turq)' : 'var(--line)'}`,
                        borderRadius: 12, padding: '9px 12px', cursor: 'pointer',
                        color: 'inherit', fontFamily: 'inherit', fontSize: 14, textAlign: 'left', width: '100%',
                      }}
                    >
                      <span style={{ flex: 1 }}>{m.rotulo}</span>
                      {motivo === m.id && <IconCheck size={16} stroke={2.5} style={{ color: 'var(--turq)' }} />}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input"
                  value={detalhe}
                  onChange={(e) => setDetalhe(e.target.value)}
                  placeholder="Quer contar mais? (opcional)"
                  rows={2}
                  maxLength={500}
                  style={{ resize: 'none', marginBottom: 12 }}
                />
              </>
            )}

            {erro && <p style={{ color: 'var(--coral)', fontSize: 12.5, margin: '0 0 10px' }}>{erro}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAberto(null)} disabled={ocupado}>
                Cancelar
              </button>
              <button
                className="btn acento"
                style={{ flex: 1, justifyContent: 'center', background: aberto === 'bloquear' ? 'var(--coral)' : undefined }}
                onClick={aberto === 'bloquear' ? confirmarBloqueio : confirmarDenuncia}
                disabled={ocupado}
              >
                {ocupado ? 'Enviando…' : aberto === 'bloquear' ? 'Bloquear' : 'Enviar denúncia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {feito && (
        <div
          role="status"
          style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 90px)', zIndex: 210,
            background: 'var(--deep)', color: '#fff', fontSize: 13, fontWeight: 600,
            padding: '10px 16px', borderRadius: 99, boxShadow: 'var(--shadow)',
            maxWidth: 'calc(100% - 32px)',
          }}
          onAnimationEnd={() => setFeito(null)}
        >
          {feito}
        </div>
      )}
    </div>
  )
}

function BotaoMenu({ icone, children, perigo, onClick }: {
  icone: React.ReactNode; children: React.ReactNode; perigo?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '10px 14px', background: 'none', border: 0, cursor: 'pointer',
        fontSize: 14, fontWeight: 600, fontFamily: 'inherit', textAlign: 'left',
        color: perigo ? 'var(--coral)' : 'var(--text)',
      }}
    >
      {icone}
      {children}
    </button>
  )
}
