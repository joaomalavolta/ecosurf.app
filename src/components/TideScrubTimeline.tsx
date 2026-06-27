import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { IconRipple, IconWaveSine, IconWind, IconCamera, IconFlag, IconChevronLeft, IconChevronRight, IconShare } from '@tabler/icons-react'
import type { EventoVento, Foto, PontoMare } from '../types/domain'
import { corFrescor, frescor, horaCurta, horaDoDia, rotuloFrescor } from '../lib/time'
import { rotuloVento } from '../lib/surf'
import { denunciarFoto } from '../services/moderacao'
import { Photo } from './Photo'
import { ProvenanceBadge } from './ProvenanceBadge'

const VB_W = 100
const VB_H = 44
const SVG_H = 110

/** Find local maxima (high) and minima (low) of the tide curve */
function encontrarPicosVales(curva: PontoMare[]): { hora: number; alturaM: number; tipo: 'alta' | 'baixa' }[] {
  if (curva.length < 3) return []
  const result: { hora: number; alturaM: number; tipo: 'alta' | 'baixa' }[] = []
  for (let i = 1; i < curva.length - 1; i++) {
    const prev = curva[i - 1].alturaM
    const curr = curva[i].alturaM
    const next = curva[i + 1].alturaM
    if (curr >= prev && curr >= next && curr !== prev) {
      result.push({ hora: curva[i].hora, alturaM: curr, tipo: 'alta' })
    } else if (curr <= prev && curr <= next && curr !== prev) {
      result.push({ hora: curva[i].hora, alturaM: curr, tipo: 'baixa' })
    }
  }
  return result
}

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

function nomeDiaCurto(date: Date): string {
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
}

function labelDia(date: Date, hoje: Date): string {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const h = new Date(hoje); h.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - h.getTime()) / 86_400_000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  if (diff === -1) return 'Ontem'
  return `${nomeDiaCurto(date)} ${date.getDate()}`
}

function diasDaSemana(hoje: Date): Date[] {
  const dias: Date[] = []
  for (let i = -3; i <= 3; i++) {
    const d = new Date(hoje)
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    dias.push(d)
  }
  return dias
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function fmtHora(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`
}

/** Compartilhar pico via Web Share API ou fallback WhatsApp. */
export async function compartilharPico(picoId: string, picoNome: string, condicao?: string) {
  const url = `${window.location.origin}/pico/${picoId}`
  const texto = condicao
    ? `🏄 ${picoNome} — ${condicao}\nVeja o mar ao vivo no Ecosurf:`
    : `🏄 Veja como está ${picoNome} agora no Ecosurf:`
  if (navigator.share) {
    try {
      await navigator.share({ title: `Ecosurf · ${picoNome}`, text: texto, url })
      return
    } catch { /* cancelou */ }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`, '_blank')
}

export function TideScrubTimeline({
  picoId,
  picoNome,
  fotos,
  curva,
  curvasMultiDia,
  eventos,
}: {
  picoId?: string
  picoNome?: string
  fotos: Foto[]
  curva: PontoMare[]
  curvasMultiDia?: Record<string, PontoMare[]>
  eventos: EventoVento[]
}) {
  /* ── TODOS OS HOOKS PRIMEIRO (antes de qualquer return condicional) ── */

  const hoje = useMemo(() => new Date(), [])
  const todasHoje = useMemo(() => dateKey(hoje), [hoje])

  const dias = useMemo(() => {
    const dMap = new Map<string, Date>()
    // 1. Janela padrão (-3 a +3)
    for (let i = -3; i <= 3; i++) {
      const d = new Date(hoje)
      d.setDate(d.getDate() + i)
      d.setHours(0, 0, 0, 0)
      dMap.set(dateKey(d), d)
    }
    // 2. Dias com fotos
    fotos.forEach(f => {
      const dk = f.capturadaEm.slice(0, 10)
      if (!dMap.has(dk)) {
        const d = new Date(f.capturadaEm)
        d.setHours(0, 0, 0, 0)
        dMap.set(dk, d)
      }
    })
    // 3. Ordenar
    const arr = Array.from(dMap.values())
    arr.sort((a, b) => a.getTime() - b.getTime())
    return arr
  }, [hoje, fotos])

  const [selectedDiaKey, setSelectedDiaKey] = useState<string>(todasHoje)

  const diaIdx = useMemo(() => {
    const idx = dias.findIndex(d => dateKey(d) === selectedDiaKey)
    return idx !== -1 ? idx : dias.findIndex(d => dateKey(d) === todasHoje)
  }, [dias, selectedDiaKey, todasHoje])

  const diaAtual = dias[diaIdx] ?? hoje
  const diaKey = dateKey(diaAtual)

  const curvaDoDia = useMemo(() => {
    if (curvasMultiDia?.[diaKey]) return curvasMultiDia[diaKey]
    return curva
  }, [curva, curvasMultiDia, diaKey])

  const fotosEfetivas = useMemo(
    () => fotos.filter(f => f.capturadaEm.startsWith(diaKey)),
    [fotos, diaKey],
  )

  const ordenadas = useMemo(
    () => [...fotosEfetivas].sort((a, b) => a.capturadaEm.localeCompare(b.capturadaEm)),
    [fotosEfetivas],
  )
  const horas = useMemo(() => ordenadas.map((f) => horaDoDia(f.capturadaEm)), [ordenadas])

  const agoraH = useMemo(() => {
    const now = new Date()
    return now.getHours() + now.getMinutes() / 60
  }, [])

  const idxMaisProximoDeAgora = useMemo(() => {
    if (horas.length === 0) return 0
    let best = 0, bd = Infinity
    horas.forEach((fh, idx) => { const d = Math.abs(fh - agoraH); if (d < bd) { bd = d; best = idx } })
    return best
  }, [horas, agoraH])

  const [ativo, setAtivo] = useState(idxMaisProximoDeAgora)
  const [dir, setDir] = useState(0)
  const [scrubHora, setScrubHora] = useState<number | null>(null)
  const [denunciadas, setDenunciadas] = useState<Record<string, boolean>>({})
  const [curtidasMap, setCurtidasMap] = useState<Record<string, number>>({})

  const trackRef = useRef<HTMLDivElement>(null)
  const arrastando = useRef(false)

  const { min, max } = useMemo(() => {
    if (curvaDoDia.length === 0) return { min: 0, max: 1 }
    const alts = curvaDoDia.map((p) => p.alturaM)
    return { min: Math.min(...alts), max: Math.max(...alts) }
  }, [curvaDoDia])

  const selecionarPorClientX = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    const h = frac * 24
    setScrubHora(h)
    let best = 0, bd = Infinity
    horas.forEach((fh, idx) => { const d = Math.abs(fh - h); if (d < bd) { bd = d; best = idx } })
    setDir(best > ativo ? 1 : best < ativo ? -1 : 0)
    setAtivo(best)
  }, [horas, ativo])

  useEffect(() => { setAtivo(idxMaisProximoDeAgora) }, [idxMaisProximoDeAgora])

  useEffect(() => {
    let vivo = true
    async function loadLikes() {
      if (ordenadas.length === 0) return
      const foto = ordenadas[ativo]
      if (!foto || curtidasMap[foto.id] !== undefined) return
      const { getCurtidas } = await import('../services/supabase/rest')
      const c = await getCurtidas(foto.id)
      if (vivo) setCurtidasMap(m => ({ ...m, [foto.id]: c }))
    }
    loadLikes()
    return () => { vivo = false }
  }, [ativo, ordenadas])

  /* ── VALORES DERIVADOS (não-hooks) ── */

  const ehHoje = diaKey === todasHoje
  const x = (h: number) => (h / 24) * VB_W
  const y = (alt: number) => 6 + (1 - (alt - min) / ((max - min) || 1)) * 30
  const topPx = (alt: number) => (y(alt) / VB_H) * SVG_H
  const linha = curvaDoDia.map((p, i) => `${i ? 'L' : 'M'}${x(p.hora).toFixed(2)} ${y(p.alturaM).toFixed(2)}`).join(' ')
  const area = `${linha} L${VB_W} ${VB_H} L0 ${VB_H} Z`
  const f = ordenadas.length > 0 ? ordenadas[ativo] : null
  const fr = f ? frescor(f.capturadaEm) : null

  async function denunciar(id: string) {
    try { await denunciarFoto(id); setDenunciadas((d) => ({ ...d, [id]: true })) } catch { /* */ }
  }

  /* ── EARLY RETURNS (depois de TODOS os hooks) ── */



  /* ── RENDER ── */

  return (
    <div className="card">
      {/* FOTO — conteúdo nobre */}
      {f ? (
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

          {/* Setas de navegação */}
          {ordenadas.length > 1 && (
            <>
              {ativo > 0 && (
                <button onClick={() => { setDir(-1); setScrubHora(null); setAtivo(a => Math.max(0, a - 1)) }} aria-label="Foto anterior"
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}>
                  <IconChevronLeft size={20} stroke={2.5} />
                </button>
              )}
              {ativo < ordenadas.length - 1 && (
                <button onClick={() => { setDir(1); setScrubHora(null); setAtivo(a => Math.min(ordenadas.length - 1, a + 1)) }} aria-label="Próxima foto"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 5 }}>
                  <IconChevronRight size={20} stroke={2.5} />
                </button>
              )}
              <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.5)', borderRadius: 10, padding: '2px 8px', color: '#fff', fontSize: 11, zIndex: 5 }}>
                {ativo + 1} / {ordenadas.length}
              </div>
            </>
          )}

          <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span className="tag" style={{ background: 'rgba(11,58,83,.72)', color: '#fff' }}>
              {horaCurta(f.capturadaEm)} · {f.autorNome}
            </span>
            {fr && <span className="tag" style={{ background: 'rgba(255,255,255,.92)', color: corFrescor(fr) }}>● {rotuloFrescor(fr)}</span>}
          </div>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 12px 12px', color: '#fff', background: 'linear-gradient(to top, rgba(11,58,83,.88), transparent)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <ProvenanceBadge p={f.procedencia} />
              {f.alturaMareM != null && <span className="tag mar"><IconWaveSine size={13} stroke={2.2} /> {f.alturaMareM.toFixed(1)}m</span>}
              {f.ventoTipo && <span className="tag" style={{ background: 'rgba(255,255,255,.9)', color: 'var(--azul-abissal)' }}><IconWind size={13} stroke={2.2} /> {rotuloVento(f.ventoTipo)}</span>}
            </div>
            <div className="between">
              {f.observacao ? <div style={{ fontSize: 14, fontWeight: 600 }}>{f.observacao}</div> : <span />}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button onClick={async () => { try { const { curtirFoto } = await import('../services/supabase/rest'); await curtirFoto(f.id); setCurtidasMap(m => ({ ...m, [f.id]: (m[f.id] || 0) + 1 })) } catch (e: any) { alert(e.message) } }} aria-label="Curtir foto"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.16)', border: 0, color: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <span style={{ fontSize: 14 }}>🤙</span> {curtidasMap[f.id] || 0}
                </button>
                <button onClick={() => compartilharPico(picoId || f.picoId, picoNome || f.picoId)} aria-label="Compartilhar"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,.16)', border: 0, color: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  <IconShare size={13} stroke={2} /> enviar
                </button>
                {denunciadas[f.id] ? (
                  <span style={{ fontSize: 11, opacity: 0.8 }}>denunciada</span>
                ) : (
                  <button onClick={() => denunciar(f.id)} aria-label="Denunciar foto"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 0, color: 'rgba(255,255,255,.6)', borderRadius: 999, padding: '4px 0', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    <IconFlag size={12} stroke={2} /> denunciar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ aspectRatio: '4 / 3', background: 'var(--cinza)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <IconRipple size={36} stroke={1.6} color="var(--azul-medio)" />
            <h3 style={{ marginTop: 8 }}>Sem fotos {ehHoje ? 'hoje' : labelDia(diaAtual, hoje)}</h3>
            <p className="muted">{ehHoje ? 'Esse pico ainda não acendeu hoje.' : 'Nenhuma foto registrada neste dia.'}</p>
            {ehHoje && (
              <Link to={picoId ? `/capturar?pico=${picoId}` : '/capturar'} className="btn acento full" style={{ marginTop: 8 }}>
                <IconCamera size={18} stroke={2} /> Registrar agora
              </Link>
            )}
          </div>
        </div>
      )}

      {/* TABS DOS DIAS DA SEMANA */}
      <div className="tide-day-tabs" role="tablist" aria-label="Dias da semana">
        {dias.map((d, i) => {
          const key = dateKey(d)
          const fotosNoDia = fotos.filter(f2 => f2.capturadaEm.startsWith(key))
          const isHoje = key === todasHoje
          const isAtivo = i === diaIdx
          return (
            <button key={key} role="tab" aria-selected={isAtivo}
              className={`tide-day-tab ${isAtivo ? 'active' : ''} ${isHoje ? 'hoje' : ''}`}
              onClick={() => setSelectedDiaKey(key)}>
              <span className="tide-day-label">{labelDia(d, hoje)}</span>
              {fotosNoDia.length > 0 && <span className="tide-day-badge">{fotosNoDia.length}</span>}
            </button>
          )
        })}
      </div>

      {/* Date paginator */}
      <div className="between" style={{ padding: '0 20px', marginTop: 16 }}>
        <button className="btn outline ic" onClick={() => setSelectedDiaKey(dateKey(dias[Math.max(0, diaIdx - 1)]))} disabled={diaIdx === 0}><IconChevronLeft size={18} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul-escuro)' }}>{labelDia(diaAtual, hoje)}</span>
        </div>
        <button className="btn outline ic" onClick={() => setSelectedDiaKey(dateKey(dias[Math.min(dias.length - 1, diaIdx + 1)]))} disabled={diaIdx === dias.length - 1}><IconChevronRight size={18} /></button>
      </div>

      {/* Bubbles horizontais */}
      <div style={{ padding: '0 20px', marginTop: 15, zIndex: 10, position: 'relative' }}>
        {fotosEfetivas.length > 0 ? (
          <StoryBubbles
            fotos={ordenadas}
            ativo={ativo}
            onSelect={(idx) => {
              setDir(idx > ativo ? 1 : idx < ativo ? -1 : 0)
              setAtivo(idx)
              setScrubHora(horas[idx])
            }}
          />
        ) : (
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.7)', borderRadius: 12, textAlign: 'center' }}>
            <p className="muted" style={{ marginBottom: 10, fontSize: 14 }}>Sem relatos neste dia.</p>
            {fotos.length > 0 && (() => {
              const globalOrdenadas = [...fotos].sort((a, b) => b.capturadaEm.localeCompare(a.capturadaEm))
              const ultimaFoto = globalOrdenadas[0]
              const dk = ultimaFoto.capturadaEm.slice(0, 10)
              if (dk !== diaKey) {
                return (
                  <button className="btn" onClick={() => setSelectedDiaKey(dk)} style={{ margin: '0 auto' }}>
                    <IconCamera size={16} /> Ver último relato ({dk.slice(8,10)}/{dk.slice(5,7)})
                  </button>
                )
              }
              return null
            })()}
          </div>
        )}
      </div>

      {/* SCRUB = curva de maré — Immersive Glass v4 */}
      <div style={{ padding: '10px 14px 14px' }}>
        {/* Container arredondado */}
        {/* Layout: Y-axis ruler | Chart area */}
        <div style={{ display: 'flex', gap: 0, background: 'var(--card)', borderRadius: 16, padding: '8px 4px 4px 0', border: '1px solid var(--line)' }}>
          {/* Y-axis ruler */}
          <div style={{ width: 28, position: 'relative', flexShrink: 0, marginTop: 28, marginBottom: 22 }}>
            {(() => {
              // Gerar ticks bonitos para o eixo Y
              const rangeM = max - min
              const step = rangeM > 2 ? 1 : rangeM > 1 ? 0.5 : 0.2
              const ticks: number[] = []
              const lo = Math.floor(min / step) * step
              for (let v = lo; v <= max + step * 0.1; v += step) {
                ticks.push(Math.round(v * 10) / 10)
              }
              return ticks.map((v) => {
                const pct = (1 - (v - min) / ((max - min) || 1)) * 100
                const yPctClamped = Math.max(2, Math.min(98, (6 / VB_H + pct / 100 * 30 / VB_H) * 100))
                return (
                  <span key={v} style={{
                    position: 'absolute',
                    right: 4,
                    top: `${yPctClamped}%`,
                    transform: 'translateY(-50%)',
                    fontSize: 8.5,
                    fontWeight: 600,
                    color: 'var(--muted)',
                    opacity: 0.55,
                    whiteSpace: 'nowrap',
                  }}>
                    {v.toFixed(1)}
                  </span>
                )
              })
            })()}
            {/* Unit label */}
            <span style={{
              position: 'absolute', top: -14, right: 2,
              fontSize: 8, fontWeight: 800, color: 'var(--azul-medio)',
              opacity: 0.7, letterSpacing: '0.5px',
            }}>m</span>
          </div>

          {/* Chart area */}
          <div ref={trackRef} role="slider" aria-label="Linha do tempo de maré" tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { setDir(1); setScrubHora(null); setAtivo(a => Math.min(ordenadas.length - 1, a + 1)) }
              if (e.key === 'ArrowLeft') { setDir(-1); setScrubHora(null); setAtivo(a => Math.max(0, a - 1)) }
            }}
            onPointerDown={(e) => { arrastando.current = true; e.currentTarget.setPointerCapture(e.pointerId); selecionarPorClientX(e.clientX) }}
            onPointerMove={(e) => { if (arrastando.current) selecionarPorClientX(e.clientX) }}
            onPointerUp={(e) => { arrastando.current = false; e.currentTarget.releasePointerCapture(e.pointerId); setScrubHora(null) }}
            onPointerCancel={(e) => { arrastando.current = false; e.currentTarget.releasePointerCapture(e.pointerId); setScrubHora(null) }}
            style={{ position: 'relative', paddingTop: 28, paddingBottom: 22, touchAction: 'none', cursor: 'ew-resize', userSelect: 'none', flex: 1, minWidth: 0 }}>

            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height={SVG_H} preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
              <defs>
                <linearGradient id="grad-mare-v3" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1ECBC3" stopOpacity="0.45" />
                  <stop offset="35%" stopColor="#1A7FB8" stopOpacity="0.3" />
                  <stop offset="70%" stopColor="#0D4D6E" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0b3a53" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="grad-linha-v3" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,255,255,.5)" />
                  <stop offset="30%" stopColor="rgba(255,255,255,.85)" />
                  <stop offset="70%" stopColor="rgba(255,255,255,.85)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,.5)" />
                </linearGradient>
                <filter id="glow-line">
                  <feGaussianBlur stdDeviation="0.6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              {/* Horizontal grid lines */}
              {(() => {
                const rangeM = max - min
                const step = rangeM > 2 ? 1 : rangeM > 1 ? 0.5 : 0.2
                const lines: JSX.Element[] = []
                const lo = Math.floor(min / step) * step
                for (let v = lo; v <= max + step * 0.1; v += step) {
                  const yVal = y(Math.round(v * 10) / 10)
                  lines.push(<line key={v} x1={0} y1={yVal} x2={VB_W} y2={yVal} stroke="var(--line)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" opacity="0.5" strokeDasharray="2 2" />)
                }
                return lines
              })()}
              {/* Filled area */}
              <path d={area} fill="url(#grad-mare-v3)" />
              {/* Curve line with glow */}
              <path d={linha} fill="none" stroke="url(#grad-linha-v3)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" filter="url(#glow-line)" />

              {/* AGORA vertical line (only line, no circle — circle is HTML) */}
              {ehHoje && (
                <line x1={x(agoraH)} y1={0} x2={x(agoraH)} y2={VB_H} stroke="#1ECBC3" strokeWidth="0.8" vectorEffect="non-scaling-stroke" opacity="0.5" strokeDasharray="2 1.5" />
              )}

              {/* Handle vertical line */}
              {ordenadas.length > 0 && (
                <line
                  x1={x(scrubHora ?? horas[ativo])} y1={0}
                  x2={x(scrubHora ?? horas[ativo])} y2={VB_H}
                  stroke={scrubHora == null ? "rgba(30,203,195,0.25)" : "#1ECBC3"}
                  strokeWidth="0.5" strokeDasharray={scrubHora == null ? '1.4 1.4' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {/* HTML round dots for picos/vales — always perfectly round */}
            {(() => {
              const pv = encontrarPicosVales(curvaDoDia)
              return pv.map((p, i) => {
                const isAlta = p.tipo === 'alta'
                return (
                  <div key={`dot-${i}`} style={{
                    position: 'absolute',
                    left: `${(p.hora / 24) * 100}%`,
                    top: 28 + topPx(p.alturaM),
                    transform: 'translate(-50%, -50%)',
                    width: 8, height: 8, borderRadius: '50%',
                    background: isAlta ? '#1ECBC3' : '#FF6B6B',
                    border: '2px solid #fff',
                    boxShadow: `0 1px 4px ${isAlta ? 'rgba(30,203,195,.5)' : 'rgba(255,107,107,.4)'}`,
                    pointerEvents: 'none', zIndex: 3,
                  }} />
                )
              })
            })()}

            {/* AGORA — round HTML dot with pulse */}
            {ehHoje && (
              <div style={{
                position: 'absolute',
                left: `${(agoraH / 24) * 100}%`,
                top: 28 + topPx(alturaNaHora(curvaDoDia, agoraH)),
                transform: 'translate(-50%, -50%)',
                width: 10, height: 10, borderRadius: '50%',
                background: '#1ECBC3',
                border: '2px solid #fff',
                boxShadow: '0 0 8px rgba(30,203,195,.6)',
                animation: 'pulse 2s ease-in-out infinite',
                pointerEvents: 'none', zIndex: 3,
              }} />
            )}

            {/* Handle — round HTML dot */}
            {ordenadas.length > 0 && (
              <div style={{
                position: 'absolute',
                left: `${((scrubHora ?? horas[ativo]) / 24) * 100}%`,
                top: 28 + topPx(alturaNaHora(curvaDoDia, scrubHora ?? horas[ativo])),
                transform: 'translate(-50%, -50%)',
                width: 14, height: 14, borderRadius: '50%',
                background: scrubHora == null ? '#1A7FB8' : '#0D6EA8',
                border: '2.5px solid rgba(255,255,255,.85)',
                boxShadow: '0 2px 8px rgba(0,0,0,.3)',
                pointerEvents: 'none', zIndex: 5,
                transition: scrubHora == null ? 'left .1s ease-out' : 'none',
              }} />
            )}

            {/* Floating badges — maré alta/baixa */}
            {(() => {
              const pv = encontrarPicosVales(curvaDoDia)
              return pv.map((p, i) => {
                const isAlta = p.tipo === 'alta'
                const leftPct = (p.hora / 24) * 100
                const topPos = 28 + topPx(p.alturaM)
                return (
                  <span
                    key={`badge-${i}`}
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      top: isAlta ? topPos - 28 : topPos + 8,
                      transform: 'translateX(-50%)',
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      background: isAlta ? 'rgba(30,203,195,.18)' : 'rgba(255,107,107,.15)',
                      border: `1px solid ${isAlta ? 'rgba(30,203,195,.4)' : 'rgba(255,107,107,.35)'}`,
                      color: isAlta ? '#1ECBC3' : '#FF6B6B',
                      borderRadius: 10, padding: '2px 7px',
                      fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
                      zIndex: 3,
                    }}
                  >
                    {p.alturaM.toFixed(1)}m · {fmtHora(p.hora)}
                  </span>
                )
              })
            })()}

            {/* Label AGORA */}
            {ehHoje && (
              <span style={{
                position: 'absolute', top: 8,
                left: `${(agoraH / 24) * 100}%`, transform: 'translateX(-50%)',
                fontSize: 8, fontWeight: 800, color: '#1ECBC3',
                letterSpacing: '0.6px', textTransform: 'uppercase',
                whiteSpace: 'nowrap', pointerEvents: 'none',
                background: 'rgba(30,203,195,.12)', padding: '1px 6px', borderRadius: 6,
              }}>
                agora
              </span>
            )}

            {/* Thumbnails das fotos na curva */}
            {ordenadas.map((ft, idx) => {
              const h = horas[idx]
              const alt = alturaNaHora(curvaDoDia, h)
              const isAtivo = idx === ativo
              const size = isAtivo ? 28 : 20
              return (
                <button key={ft.id} onClick={() => { setDir(idx > ativo ? 1 : -1); setAtivo(idx) }} aria-label={`Foto das ${horaCurta(ft.capturadaEm)}`}
                  style={{
                    position: 'absolute',
                    left: `${(h / 24) * 100}%`,
                    top: 28 + topPx(alt),
                    transform: 'translate(-50%, -50%)',
                    width: size, height: size,
                    borderRadius: '50%',
                    border: isAtivo ? '2.5px solid #1ECBC3' : '2px solid rgba(255,255,255,.85)',
                    background: 'var(--azul-medio)',
                    boxShadow: isAtivo ? '0 3px 12px rgba(30,203,195,.45)' : '0 2px 6px rgba(0,0,0,.2)',
                    padding: 0, cursor: 'pointer', overflow: 'hidden',
                    transition: 'all .15s ease-out', zIndex: 4,
                  }}>
                  {ft.url && (
                    <img src={ft.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }} />
                  )}
                </button>
              )
            })}

            {/* Eixo de horas — relógio 24h */}
            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
              <span key={h} style={{
                position: 'absolute', bottom: 2,
                left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)',
                fontSize: 8.5, fontWeight: 600, color: 'var(--muted)',
                opacity: h === 0 || h === 12 ? 0.7 : 0.5,
                fontVariantNumeric: 'tabular-nums',
              }}>{String(h).padStart(2, '0')}:00</span>
            ))}

            {/* Eventos de vento */}
            {scrubHora == null && eventos.map((ev) => (
              <span key={ev.rotulo} style={{ position: 'absolute', top: 8, left: `${(ev.hora / 24) * 100}%`, transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: 'var(--azul-medio)', whiteSpace: 'nowrap' }}>
                ↡ {ev.rotulo}
              </span>
            ))}

            {/* Leitura contínua sob o dedo */}
            {scrubHora != null && (
              <span style={{
                position: 'absolute', top: 8,
                left: `${(scrubHora / 24) * 100}%`, transform: 'translateX(-50%)',
                background: 'rgba(11,58,83,.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                color: '#fff', fontSize: 10.5, fontWeight: 700,
                padding: '3px 10px', borderRadius: 10,
                whiteSpace: 'nowrap', pointerEvents: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,.25)',
                border: '1px solid rgba(30,203,195,.3)',
              }}>
                {fmtHora(scrubHora)} · {alturaNaHora(curvaDoDia, scrubHora).toFixed(1)}m
              </span>
            )}
          </div>
        </div>

        {/* Info strip — glass pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, marginLeft: 28 }}>
          <span className="tide-info-chip" style={{
            background: 'rgba(30,203,195,.1)', border: '1px solid rgba(30,203,195,.25)',
            color: '#1ECBC3', fontWeight: 700,
          }}>
            <IconWaveSine size={13} stroke={2.2} /> {alturaNaHora(curvaDoDia, scrubHora ?? agoraH).toFixed(1)}m
          </span>
          <span className="tide-info-chip" style={{
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
          }}>
            {(() => {
              const hAtual = scrubHora ?? agoraH
              const antes = alturaNaHora(curvaDoDia, Math.max(0, hAtual - 0.5))
              const agora = alturaNaHora(curvaDoDia, hAtual)
              return agora >= antes ? '↑ enchendo' : '↓ vazando'
            })()}
          </span>
          <span className="tide-info-chip" style={{
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)',
          }}>
            {(() => {
              const hAtual = scrubHora ?? agoraH
              for (let h = Math.ceil(hAtual); h <= 24; h += 0.5) {
                const a = alturaNaHora(curvaDoDia, h - 0.5)
                const b = alturaNaHora(curvaDoDia, h)
                const c = alturaNaHora(curvaDoDia, Math.min(24, h + 0.5))
                if ((b >= a && b >= c) || (b <= a && b <= c)) {
                  const tipo = b >= a ? 'cheia' : 'seca'
                  return `${tipo} às ${fmtHora(h)}`
                }
              }
              return ''
            })()}
          </span>
        </div>
      </div>
    </div>
  )
}
