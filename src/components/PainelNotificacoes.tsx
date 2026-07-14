import { useEffect, useState } from 'react'
import { IconBell, IconBellOff, IconAlertTriangle, IconUsersGroup, IconRipple, IconDeviceMobileShare } from '@tabler/icons-react'
import { estadoPush, ligarPush, desligarPush, type EstadoPush } from '../lib/push'
import { lerPreferencia, gravarPreferencia } from '../services/preferencias-conta'

/**
 * Notificações — opt-in explícito, opt-out de verdade.
 *
 * O interruptor de cima manda em tudo: desligado, o aparelho é apagado do
 * servidor e o Ecosurf perde qualquer meio de alcançar você. Ligado, os três
 * assuntos podem ser recusados um a um — e o filtro é aplicado no SERVIDOR,
 * não aqui: a escolha vale mesmo que um cliente se comporte mal.
 */
export function PainelNotificacoes() {
  const [estado, setEstado] = useState<EstadoPush | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const [alertas, setAlertas] = useState(() => lerPreferencia('notificacoes', 'alertas', true))
  const [mutiroes, setMutiroes] = useState(() => lerPreferencia('notificacoes', 'mutiroes', true))
  const [picos, setPicos] = useState(() => lerPreferencia('notificacoes', 'picos', true))

  useEffect(() => { void estadoPush().then(setEstado) }, [])

  const ligado = estado === 'ligado'

  async function alternarGeral() {
    setOcupado(true)
    setErro(null)
    if (ligado) {
      await desligarPush()
      gravarPreferencia('notificacoes', 'ativas', false)
      setEstado('desligado')
    } else {
      const r = await ligarPush()
      setEstado(r.estado)
      if (r.erro) setErro(r.erro)
      if (r.estado === 'ligado') gravarPreferencia('notificacoes', 'ativas', true)
    }
    setOcupado(false)
  }

  function alternarAssunto(
    chave: 'alertas' | 'mutiroes' | 'picos',
    valor: boolean,
    set: (v: boolean) => void,
  ) {
    const novo = !valor
    set(novo)
    gravarPreferencia('notificacoes', chave, novo)
  }

  return (
    <div className="card pad" style={{ marginTop: 12 }}>
      <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <IconBell size={12} stroke={2} /> Notificações
      </span>

      {estado === 'precisa-instalar' ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 10 }}>
          <IconDeviceMobileShare size={20} stroke={2} style={{ flexShrink: 0, marginTop: 2 }} />
          <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
            No iPhone, as notificações só funcionam com o Ecosurf instalado na tela de início.
            Toque em compartilhar no Safari e escolha <b>Adicionar à Tela de Início</b> — depois
            volte aqui.
          </p>
        </div>
      ) : estado === 'indisponivel' ? (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
          Este navegador não permite notificações.
        </p>
      ) : (
        <>
          <button
            className="row"
            onClick={() => { void alternarGeral() }}
            disabled={ocupado || estado === null}
            style={{
              background: 'none', border: 'none', width: '100%', textAlign: 'left',
              cursor: 'pointer', padding: '10px 2px', color: 'inherit', fontFamily: 'inherit',
              marginTop: 4,
            }}
          >
            {ligado ? <IconBell size={20} stroke={2} /> : <IconBellOff size={20} stroke={2} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5 }}>Receber notificações</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {ligado ? 'Ativas neste aparelho' : 'Você não receberá nenhum aviso'}
              </div>
            </div>
            <span
              aria-hidden
              style={{
                width: 42, height: 24, borderRadius: 99, flexShrink: 0,
                background: ligado ? '#1ECBC3' : 'var(--cinza)',
                position: 'relative', transition: 'background .2s',
                opacity: ocupado ? .5 : 1,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: ligado ? 21 : 3,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.25)',
              }} />
            </span>
          </button>

          {erro && (
            <p style={{ fontSize: 12, color: 'var(--perigo, #c22)', lineHeight: 1.45, margin: '4px 2px 0' }}>
              {erro}
            </p>
          )}

          {ligado && (
            <div style={{ marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--borda, rgba(0,0,0,.08))' }}>
              <p className="muted" style={{ fontSize: 11, margin: '8px 2px 2px' }}>
                Escolha o que vale um aviso:
              </p>
              <LinhaAssunto
                Icone={IconAlertTriangle} titulo="Alertas ambientais"
                sub="Esgoto, óleo, lixo e outros impactos"
                valor={alertas} onToggle={() => alternarAssunto('alertas', alertas, setAlertas)}
              />
              <LinhaAssunto
                Icone={IconUsersGroup} titulo="Mutirões"
                sub="Ações coletivas na sua região"
                valor={mutiroes} onToggle={() => alternarAssunto('mutiroes', mutiroes, setMutiroes)}
              />
              <LinhaAssunto
                Icone={IconRipple} titulo="Picos favoritos"
                sub="Quando um pico que você segue acende"
                valor={picos} onToggle={() => alternarAssunto('picos', picos, setPicos)}
              />
            </div>
          )}

          <p className="muted" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.45 }}>
            Ao desligar, este aparelho é apagado dos nossos servidores — o Ecosurf deixa de
            ter como alcançar você.
          </p>
        </>
      )}
    </div>
  )
}

function LinhaAssunto({ Icone, titulo, sub, valor, onToggle }: {
  Icone: typeof IconBell; titulo: string; sub: string; valor: boolean; onToggle: () => void
}) {
  return (
    <button
      className="row"
      onClick={onToggle}
      style={{
        background: 'none', border: 'none', width: '100%', textAlign: 'left',
        cursor: 'pointer', padding: '8px 2px', color: 'inherit', fontFamily: 'inherit',
      }}
    >
      <Icone size={18} stroke={2} style={{ opacity: valor ? 1 : .45 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, opacity: valor ? 1 : .55 }}>{titulo}</div>
        <div className="muted" style={{ fontSize: 11.5 }}>{sub}</div>
      </div>
      <span
        aria-hidden
        style={{
          width: 36, height: 20, borderRadius: 99, flexShrink: 0,
          background: valor ? '#1ECBC3' : 'var(--cinza)',
          position: 'relative', transition: 'background .2s',
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: valor ? 19 : 3,
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)',
        }} />
      </span>
    </button>
  )
}
