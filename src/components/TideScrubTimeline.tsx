import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { IconRipple, IconWaveSine, IconWind, IconCamera, IconFlag } from '@tabler/icons-react'
import type { EventoVento, Foto, PontoMare } from '../types/domain'
import { corFrescor, frescor, horaCurta, horaDoDia, rotuloFrescor } from '../lib/time'
import { rotuloVento } from '../lib/surf'
import { denunciarFoto } from '../services/moderacao'
import { Photo } from './Photo'
import { ProvenanceBadge } from './ProvenanceBadge'

const VB_W = 100
const VB_H = 44
const SVG_H = 96

/** Altura interpolada da curva numa hora qualquer (para assentar os pontos). */
function alturaNaHora(curva: PontoMare[], h: number): number {
  if (curva.length === 0) return 0
  let lo = curva[0]
  for (const p of curva) {
    if (p.hora <= h) lo = p
    else {
      const t = (h - lo.hora) / ((p.hora - lo.hora) || 1)
      return lo.alturaM + t * (p.alturaM - lo.alturaM)
    }
  }
  return lo.alturaM
}

/**
 * A peça de assinatura do Ecosurf.
 * A foto (conteúdo nobre) ocupa o topo; a curva de maré do dia É a régua
 * temporal. Arrastar na curva troca a foto — a animação ensina a passagem
 * do tempo. A virada da maré e a entrada do vento aparecem na própria curva,
 * sem poluir. Cada foto carrega procedência e a maré do instante.
 */
export function TideScrubTimeline({
  picoId,
  fotos,
  curva,
  eventos,
}: {
  picoId?: string
  fotos: Foto[]
  curva: PontoMare[]
  eventos: EventoVento[]
}) {
  const ordenadas = useMemo(
    () => [...fotos].sort((a, b) => a.capturadaEm.localeCompare(b.capturadaEm)),
    [fotos],
  )
  const horas = useMemo(() => ordenadas.map((f) => horaDoDia(f.capturadaEm)), [ordenadas])
  const [ativo, setAtivo] = useState(0)
  const [dir, setDir] = useState(0)
  const [scrubHora, setScrubHora] = useState<number | null>(null)
  const [denunciadas, setDenunciadas] = useState<Record<string, boolean>>({})
  const [curtidasMap, setCurtidasMap] = useState<Record<string, number>>({})

  useEffect(() => {
    let vivo = true
    async function loadLikes() {
      if (ordenadas.length === 0) return
      const f = ordenadas[ativo]
      if (curtidasMap[f.id] !== undefined) return
      const { getCurtidas } = await import('../services/supabase/rest')
      const c = await getCurtidas(f.id)
      if (vivo) setCurtidasMap(m => ({ ...m, [f.id]: c }))
    }
    loadLikes()
    return () => { vivo = false }
  }, [ativo, ordenadas])

  async function denunciar(id: string) {
    try {
      await denunciarFoto(id)
      setDenunciadas((d) => ({ ...d, [id]: true }))
    } catch {
      /* precisa estar logado; silencioso no scaffold */
    }
  }
  const trackRef = useRef<HTMLDivElement>(null)
  const arrastando = useRef(false)

  const { min, max } = useMemo(() => {
    if (curva.length === 0) return { min: 0, max: 1 }
    const alts = curva.map((p) => p.alturaM)
    return { min: Math.min(...alts), max: Math.max(...alts) }
  }, [curva])

  if (ordenadas.length === 0) {
    return (
      <div className="card pad" style={{ textAlign: 'center' }}>
        <IconRipple size={36} stroke={1.6} color="var(--azul-medio)" />
        <h3 style={{ marginTop: 8 }}>Ainda sem fotos hoje</h3>
        <p className="muted">
          Esse pico ainda não acendeu hoje. Seja o primeiro a registrar a condição do mar.
        </p>
        <Link to={picoId ? `/capturar?pico=${picoId}` : (fotos.length > 0 ? `/capturar?pico=${fotos[0]?.picoId}` : "/capturar")} className="btn acento full" style={{ marginTop: 8 }}>
          <IconCamera size={18} stroke={2} /> Registrar agora
        </Link>
      </div>
    )
  }

  const x = (h: number) => (h / 24) * VB_W
  const y = (alt: number) => 6 + (1 - (alt - min) / ((max - min) || 1)) * 30
  const topPx = (alt: number) => (y(alt) / VB_H) * SVG_H

  const linha = curva
    .map((p, i) => `${i ? 'L' : 'M'}${x(p.hora).toFixed(2)} ${y(p.alturaM).toFixed(2)}`)
    .join(' ')
  const area = `${linha} L${VB_W} ${VB_H} L0 ${VB_H} Z`

  function selecionarPorClientX(clientX: number) {
    const el = trackRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    const h = frac * 24
    setScrubHora(h) // handle desliza contínuo com o dedo
    let best = 0
    let bd = Infinity
    horas.forEach((fh, idx) => {
      const d = Math.abs(fh - h)
      if (d < bd) {
        bd = d
        best = idx
      }
    })
    setDir(best > ativo ? 1 : best < ativo ? -1 : 0)
    setAtivo(best)
  }

  function fmtHora(h: number): string {
    const hh = Math.floor(h)
    const mm = Math.round((h - hh) * 60)
    return `${String(hh).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`
  }

  const f = ordenadas[ativo]
  const fr = frescor(f.capturadaEm)

  return (
    <div className="card">
      {/* FOTO — conteúdo nobre */}
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--azul-abissal)' }}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={f.id}
            initial={{ opacity: 0, x: dir * 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -36 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Photo seed={f.id} url={f.url} alt={f.observacao ?? 'Foto do pico'} style={{ width: '100%', height: '100%' }} />
          </motion.div>
        </AnimatePresence>

        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span className="tag" style={{ background: 'rgba(11,58,83,.72)', color: '#fff' }}>
            {horaCurta(f.capturadaEm)} · {f.autorNome}
          </span>
          <span className="tag" style={{ background: 'rgba(255,255,255,.92)', color: corFrescor(fr) }}>● {rotuloFrescor(fr)}</span>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '28px 12px 12px',
            color: '#fff',
            background: 'linear-gradient(to top, rgba(11,58,83,.88), transparent)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <ProvenanceBadge p={f.procedencia} />
            {f.alturaMareM != null && (
              <span className="tag mar"><IconWaveSine size={13} stroke={2.2} /> {f.alturaMareM.toFixed(1)}m</span>
            )}
            {f.ventoTipo && (
              <span className="tag" style={{ background: 'rgba(255,255,255,.9)', color: 'var(--azul-abissal)' }}>
                <IconWind size={13} stroke={2.2} /> {rotuloVento(f.ventoTipo)}
              </span>
            )}
          </div>
          <div className="between">
            {f.observacao ? <div style={{ fontSize: 14, fontWeight: 600 }}>{f.observacao}</div> : <span />}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* LIKES */}
              <button
                onClick={async () => {
                  try {
                    const { curtirFoto } = await import('../services/supabase/rest')
                    await curtirFoto(f.id)
                    // optimistic update
                    setCurtidasMap(m => ({ ...m, [f.id]: (m[f.id] || 0) + 1 }))
                  } catch (e: any) {
                    alert(e.message)
                  }
                }}
                aria-label="Curtir foto"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.16)', border: 0, color: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'transform 0.1s' }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{ fontSize: 14 }}>🤙</span> {curtidasMap[f.id] || 0}
              </button>

              {/* DENUNCIAR */}
              {denunciadas[f.id] ? (
                <span style={{ fontSize: 11, opacity: 0.8 }}>denunciada</span>
              ) : (
                <button
                  onClick={() => denunciar(f.id)}
                  aria-label="Denunciar foto"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: 'rgba(255,255,255,.6)', borderRadius: 999, padding: '4px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                >
                  <IconFlag size={12} stroke={2} /> denunciar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SCRUB = curva de maré do dia */}
      <div style={{ padding: '12px 14px 16px' }}>
        <div className="between" style={{ marginBottom: 6 }}>
          <span className="eyebrow">Maré do dia · arraste para ler</span>
          <span className="muted">{ativo + 1}/{ordenadas.length}</span>
        </div>

        <div
          ref={trackRef}
          role="slider"
          aria-label="Linha do tempo de maré do pico"
          aria-valuemin={0}
          aria-valuemax={ordenadas.length - 1}
          aria-valuenow={ativo}
          aria-valuetext={`${horaCurta(f.capturadaEm)} — ${f.observacao ?? ''}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              setDir(1)
              setScrubHora(null)
              setAtivo((a) => Math.min(ordenadas.length - 1, a + 1))
            }
            if (e.key === 'ArrowLeft') {
              setDir(-1)
              setScrubHora(null)
              setAtivo((a) => Math.max(0, a - 1))
            }
          }}
          onPointerDown={(e) => {
            arrastando.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            selecionarPorClientX(e.clientX)
          }}
          onPointerMove={(e) => {
            if (arrastando.current) selecionarPorClientX(e.clientX)
          }}
          onPointerUp={(e) => {
            arrastando.current = false
            e.currentTarget.releasePointerCapture(e.pointerId)
            setScrubHora(null) // encaixa na foto mais próxima
          }}
          onPointerCancel={(e) => {
            arrastando.current = false
            e.currentTarget.releasePointerCapture(e.pointerId)
            setScrubHora(null)
          }}
          style={{ position: 'relative', paddingTop: 16, paddingBottom: 16, touchAction: 'none', cursor: 'ew-resize', userSelect: 'none' }}
        >
          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height={SVG_H} preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="grad-mare" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3F8DC7" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#3F8DC7" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#grad-mare)" />
            <path d={linha} fill="none" stroke="#2E9BD6" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
            <g transform={`translate(${x(scrubHora ?? horas[ativo])}, 0)`}>
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={VB_H}
                stroke={scrubHora == null ? "rgba(13,110,168,0.55)" : "var(--acento)"}
                strokeWidth="0.5"
                strokeDasharray={scrubHora == null ? '1.4 1.4' : undefined}
                vectorEffect="non-scaling-stroke"
              />
              <rect
                x={-3}
                y={VB_H / 2 - 8}
                width={6}
                height={16}
                rx={2}
                fill={scrubHora == null ? "rgba(13,110,168,0.8)" : "var(--acento)"}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={0}
                cy={y(alturaNaHora(curva, scrubHora ?? horas[ativo]))}
                r={2.5}
                fill={scrubHora == null ? "rgba(13,110,168,0.8)" : "var(--acento)"}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </svg>

          {/* pontos das fotos (HTML, círculos crisp) */}
          {ordenadas.map((ft, idx) => {
            const h = horas[idx]
            const alt = alturaNaHora(curva, h)
            return (
              <button
                key={ft.id}
                onClick={() => {
                  setDir(idx > ativo ? 1 : -1)
                  setAtivo(idx)
                }}
                aria-label={`Foto das ${horaCurta(ft.capturadaEm)}`}
                style={{
                  position: 'absolute',
                  left: `${(h / 24) * 100}%`,
                  top: 16 + topPx(alt),
                  transform: 'translate(-50%, -50%)',
                  width: idx === ativo ? 17 : 12,
                  height: idx === ativo ? 17 : 12,
                  borderRadius: 999,
                  border: '2px solid #fff',
                  background: idx === ativo ? 'var(--turq)' : 'var(--azul-medio)',
                  boxShadow: '0 2px 6px rgba(0,0,0,.28)',
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            )
          })}

          {/* eixo de horas */}
          {[6, 9, 12, 15, 18].map((h) => (
            <span
              key={h}
              style={{ position: 'absolute', bottom: 0, left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)', fontSize: 10, color: 'var(--muted)' }}
            >
              {h}h
            </span>
          ))}

          {/* eventos de vento sobre a curva */}
          {scrubHora == null &&
            eventos.map((ev) => (
              <span
                key={ev.rotulo}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: `${(ev.hora / 24) * 100}%`,
                  transform: 'translateX(-50%)',
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: 'var(--verde)',
                  whiteSpace: 'nowrap',
                }}
              >
                ↡ {ev.rotulo}
              </span>
            ))}

          {/* leitura contínua sob o dedo */}
          {scrubHora != null && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: `${(scrubHora / 24) * 100}%`,
                transform: 'translateX(-50%)',
                background: 'var(--azul-abissal)',
                color: '#fff',
                fontSize: 10.5,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 8,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {fmtHora(scrubHora)} · {alturaNaHora(curva, scrubHora).toFixed(1)}m
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
