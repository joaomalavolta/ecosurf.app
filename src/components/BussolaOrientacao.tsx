import { useRef, useState } from 'react'
import { pontoCardeal } from '../lib/surf'
import { normalizarGraus, rumoDoToque } from '../lib/costa'

/**
 * Para que lado fica o mar aberto — apontado com o dedo, não digitado em graus.
 *
 * Ninguém sabe de cabeça que a praia dele "olha para 148°", mas todo mundo
 * sabe apontar para onde está o mar. A bússola traduz o gesto no número, e o
 * número é o que faltava para o app poder dizer terral ou maral (ver a
 * migration 0071: antes ele assumia 180° para o Brasil inteiro).
 *
 * ── Opcional de verdade ─────────────────────────────────────────────────────
 *
 * `valor` nulo é um estado legítimo e o botão "não sei" volta para ele. Um
 * pico sem orientação é cadastrado normalmente; o app só deixa de afirmar
 * terral/maral naquele pico até alguém apontar. Obrigar o palpite aqui seria
 * trocar um default errado no banco por um default errado na mão do usuário.
 */
export function BussolaOrientacao({
  valor,
  onChange,
  calculado,
  tamanho = 168,
}: {
  /** Graus para onde a praia olha, ou null se ninguém sabe. */
  valor: number | null
  onChange: (deg: number | null) => void
  /** O que a linha de costa sugeriu, para a pessoa aceitar ou corrigir. */
  calculado?: number | null
  tamanho?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [arrastando, setArrastando] = useState(false)

  /** Do ponto tocado para o rumo. A conta em si está em lib/costa.ts. */
  function grausDoEvento(clientX: number, clientY: number): number {
    const el = ref.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    return Math.round(rumoDoToque(
      clientX - (r.left + r.width / 2),
      clientY - (r.top + r.height / 2),
    ))
  }

  function aoApontar(e: React.PointerEvent) {
    e.preventDefault()
    ref.current?.setPointerCapture(e.pointerId)
    setArrastando(true)
    onChange(grausDoEvento(e.clientX, e.clientY))
  }

  function aoMover(e: React.PointerEvent) {
    if (!arrastando) return
    onChange(grausDoEvento(e.clientX, e.clientY))
  }

  function aoTeclar(e: React.KeyboardEvent) {
    // Seta move de 5° em 5°; com Shift, de 1°. Sem isto a bússola seria
    // inacessível para quem não usa toque ou mouse.
    const passo = e.shiftKey ? 1 : 5
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(normalizarGraus((valor ?? 0) + passo))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(normalizarGraus((valor ?? 0) - passo))
    }
  }

  const raio = tamanho / 2
  const anguloRad = ((valor ?? 0) - 90) * (Math.PI / 180)
  const pontaX = raio + Math.cos(anguloRad) * (raio - 22)
  const pontaY = raio + Math.sin(anguloRad) * (raio - 22)

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          ref={ref}
          role="slider"
          tabIndex={0}
          aria-label="Direção do mar aberto"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={valor ?? undefined}
          aria-valuetext={valor == null ? 'não informado' : `${pontoCardeal(valor)}, ${valor} graus`}
          onPointerDown={aoApontar}
          onPointerMove={aoMover}
          onPointerUp={() => setArrastando(false)}
          onPointerCancel={() => setArrastando(false)}
          onKeyDown={aoTeclar}
          style={{
            width: tamanho, height: tamanho, borderRadius: '50%', position: 'relative',
            border: '2px solid var(--line)', background: 'var(--fundo-card, rgba(0,0,0,.03))',
            cursor: 'pointer', flexShrink: 0, touchAction: 'none', userSelect: 'none',
          }}
        >
          {/* Rosa dos ventos: os quatro pontos que orientam o gesto. */}
          {([['N', 0], ['L', 90], ['S', 180], ['O', 270]] as const).map(([letra, g]) => {
            const r = ((g - 90) * Math.PI) / 180
            return (
              <span
                key={letra}
                style={{
                  position: 'absolute',
                  left: raio + Math.cos(r) * (raio - 11), top: raio + Math.sin(r) * (raio - 11),
                  transform: 'translate(-50%, -50%)',
                  fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                }}
              >{letra}</span>
            )
          })}

          {valor == null ? (
            <span style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11.5, color: 'var(--muted)',
              textAlign: 'center', padding: '0 30px', lineHeight: 1.35, pointerEvents: 'none',
            }}>
              Toque apontando o mar aberto
            </span>
          ) : (
            <svg width={tamanho} height={tamanho} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <line
                x1={raio} y1={raio} x2={pontaX} y2={pontaY}
                stroke="var(--turq)" strokeWidth={3} strokeLinecap="round"
              />
              <circle cx={pontaX} cy={pontaY} r={7} fill="var(--turq)" />
              <circle cx={raio} cy={raio} r={4} fill="var(--muted)" />
            </svg>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
            {valor == null
              ? 'Orientação não informada'
              : `A praia olha para ${pontoCardeal(valor)} (${valor}°)`}
          </div>
          <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.45, margin: '4px 0 8px' }}>
            {valor == null
              ? 'Sem isso o app não diz se o vento é terral ou maral neste pico — mostra só a velocidade e a direção. O pico é cadastrado do mesmo jeito.'
              : 'É com isso que o app sabe se o vento do dia é terral (limpa a onda) ou maral (bagunça).'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {calculado != null && calculado !== valor && (
              <button
                type="button"
                className="btn outline"
                style={{ fontSize: 12, padding: '6px 10px', minHeight: 32 }}
                onClick={() => onChange(calculado)}
              >
                Usar {pontoCardeal(calculado)} ({calculado}°)
              </button>
            )}
            {valor != null && (
              <button
                type="button"
                className="btn outline"
                style={{ fontSize: 12, padding: '6px 10px', minHeight: 32 }}
                onClick={() => onChange(null)}
              >
                Não sei
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
