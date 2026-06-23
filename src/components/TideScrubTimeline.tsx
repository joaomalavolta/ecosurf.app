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
const SVG_H = 96

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
  const dias = useMemo(() => diasDaSemana(hoje), [hoje])
  const todasHoje = useMemo(() => dateKey(hoje), [hoje])
  const [diaIdx, setDiaIdx] = useState(3)

  const diaAtual = dias[diaIdx]
  const diaKey = dateKey(diaAtual)

  const curvaDoDia = useMemo(() => {
    if (curvasMultiDia?.[diaKey]) return curvasMultiDia[diaKey]
    return curva
  }, [curva, curvasMultiDia, diaKey])

  const fotosDoDia = useMemo(
    () => fotos.filter(f => f.capturadaEm.startsWith(diaKey)),
    [fotos, diaKey],
  )

  const fotosEfetivas = useMemo(() => {
    if (fotosDoDia.length > 0) return fotosDoDia
    if (diaKey === todasHoje) return fotos
    return []
  }, [fotosDoDia, fotos, diaKey, todasHoje])

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

  if (fotos.length === 0) {
    return (
      <div className="card pad" style={{ textAlign: 'center', margin: '20px 0' }}>
        <p className="muted" style={{ marginBottom: 16 }}>Nenhuma foto relatada hoje neste pico.</p>
        <p>Que tal ser o primeiro?</p>
      </div>
    )
  }

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
              onClick={() => setDiaIdx(i)}>
              <span className="tide-day-label">{labelDia(d, hoje)}</span>
              {fotosNoDia.length > 0 && <span className="tide-day-badge">{fotosNoDia.length}</span>}
            </button>
          )
        })}
      </div>

      {/* SCRUB = curva de maré — Ocean Glass */}
      <div style={{ padding: '10px 14px 14px' }}>
        <div ref={trackRef} role="slider" aria-label="Linha do tempo de maré" tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { setDir(1); setScrubHora(null); setAtivo(a => Math.min(ordenadas.length - 1, a + 1)) }
            if (e.key === 'ArrowLeft') { setDir(-1); setScrubHora(null); setAtivo(a => Math.max(0, a - 1)) }
          }}
          onPointerDown={(e) => { arrastando.current = true; e.currentTarget.setPointerCapture(e.pointerId); selecionarPorClientX(e.clientX) }}
          onPointerMove={(e) => { if (arrastando.current) selecionarPorClientX(e.clientX) }}
          onPointerUp={(e) => { arrastando.current = false; e.currentTarget.releasePointerCapture(e.pointerId); setScrubHora(null) }}
          onPointerCancel={(e) => { arrastando.current = false; e.currentTarget.releasePointerCapture(e.pointerId); setScrubHora(null) }}
          style={{ position: 'relative', paddingTop: 20, paddingBottom: 20, touchAction: 'none', cursor: 'ew-resize', userSelect: 'none' }}>

          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height={SVG_H} preserveAspectRatio="none" aria-hidden="true" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="grad-mare-glass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1A7FB8" stopOpacity="0.4" />
                <stop offset="40%" stopColor="#2E9BD6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#5BB8E8" stopOpacity="0.03" />
              </linearGradient>
              <linearGradient id="grad-linha-glass" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#1A7FB8" />
                <stop offset="50%" stopColor="#2E9BD6" />
                <stop offset="100%" stopColor="#5BB8E8" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#grad-mare-glass)" />
            <path d={linha} fill="none" stroke="url(#grad-linha-glass)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />

            {/* Marcador AGORA */}
            {ehHoje && (
              <g transform={`translate(${x(agoraH)}, 0)`}>
                <line x1={0} y1={0} x2={0} y2={VB_H} stroke="#FF6B6B" strokeWidth="0.7" vectorEffect="non-scaling-stroke" opacity="0.5" strokeDasharray="1.5 1.5" />
                <circle cx={0} cy={y(alturaNaHora(curvaDoDia, agoraH))} r="2" fill="#FF6B6B" stroke="#fff" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
              </g>
            )}

            {/* Prancha handle */}
            {ordenadas.length > 0 && (
              <g transform={`translate(${x(scrubHora ?? horas[ativo])}, 0)`}>
                <line x1={0} y1={0} x2={0} y2={VB_H} stroke={scrubHora == null ? "rgba(13,110,168,0.4)" : "#0D6EA8"} strokeWidth="0.5" strokeDasharray={scrubHora == null ? '1.4 1.4' : undefined} vectorEffect="non-scaling-stroke" />
                <g transform={`translate(0, ${y(alturaNaHora(curvaDoDia, scrubHora ?? horas[ativo])) - 6})`}>
                  <path d="M0-5 C1.8-4.5 2.2-2 2.2,1 C2.2,3.5 1.6,5 0,5.8 C-1.6,5 -2.2,3.5 -2.2,1 C-2.2-2 -1.8-4.5 0-5Z" fill={scrubHora == null ? "#1A7FB8" : "#0D6EA8"} stroke="rgba(255,255,255,.7)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                  <line x1={0} y1={-4} x2={0} y2={5} stroke="rgba(255,255,255,.4)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
                </g>
              </g>
            )}
          </svg>

          {/* Label AGORA */}
          {ehHoje && (
            <span style={{ position: 'absolute', top: 4, left: `${(agoraH / 24) * 100}%`, transform: 'translateX(-50%)', fontSize: 8, fontWeight: 800, color: '#FF6B6B', letterSpacing: '0.6px', textTransform: 'uppercase', whiteSpace: 'nowrap', pointerEvents: 'none', opacity: 0.85 }}>
              agora
            </span>
          )}

          {/* Thumbnails das fotos na curva (substitui os pontos) */}
          {ordenadas.map((ft, idx) => {
            const h = horas[idx]
            const alt = alturaNaHora(curvaDoDia, h)
            const isAtivo = idx === ativo
            const size = isAtivo ? 26 : 20
            return (
              <button key={ft.id} onClick={() => { setDir(idx > ativo ? 1 : -1); setAtivo(idx) }} aria-label={`Foto das ${horaCurta(ft.capturadaEm)}`}
                style={{
                  position: 'absolute',
                  left: `${(h / 24) * 100}%`,
                  top: 20 + topPx(alt),
                  transform: 'translate(-50%, -50%)',
                  width: size,
                  height: size,
                  borderRadius: 999,
                  border: isAtivo ? '2.5px solid #0D6EA8' : '2px solid #fff',
                  background: 'var(--azul-medio)',
                  boxShadow: isAtivo ? '0 3px 10px rgba(13,110,168,.4)' : '0 2px 6px rgba(0,0,0,.2)',
                  padding: 0,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'width .15s, height .15s, border .15s, box-shadow .15s',
                }}>
                {ft.url && (
                  <img src={ft.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 999 }} />
                )}
              </button>
            )
          })}

          {/* Eixo de horas */}
          {[6, 9, 12, 15, 18].map((h) => (
            <span key={h} style={{ position: 'absolute', bottom: 2, left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)', fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', opacity: 0.7 }}>{h}h</span>
          ))}

          {/* Eventos de vento */}
          {scrubHora == null && eventos.map((ev) => (
            <span key={ev.rotulo} style={{ position: 'absolute', top: 4, left: `${(ev.hora / 24) * 100}%`, transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: 'var(--azul-medio)', whiteSpace: 'nowrap' }}>
              ↡ {ev.rotulo}
            </span>
          ))}

          {/* Leitura contínua sob o dedo */}
          {scrubHora != null && (
            <span style={{ position: 'absolute', top: 4, left: `${(scrubHora / 24) * 100}%`, transform: 'translateX(-50%)', background: 'var(--azul-abissal)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8, whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
              {fmtHora(scrubHora)} · {alturaNaHora(curvaDoDia, scrubHora).toFixed(1)}m
            </span>
          )}
        </div>

        {/* Info strip — dados da maré atual */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <span className="tide-info-chip">
            <IconWaveSine size={13} stroke={2} /> {alturaNaHora(curvaDoDia, scrubHora ?? agoraH).toFixed(1)}m
          </span>
          <span className="tide-info-chip">
            {(() => {
              const hAtual = scrubHora ?? agoraH
              const antes = alturaNaHora(curvaDoDia, Math.max(0, hAtual - 0.5))
              const agora = alturaNaHora(curvaDoDia, hAtual)
              return agora >= antes ? '↑ enchendo' : '↓ vazando'
            })()}
          </span>
          <span className="tide-info-chip">
            {(() => {
              const hAtual = scrubHora ?? agoraH
              // Encontrar próxima virada (máximo ou mínimo)
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

