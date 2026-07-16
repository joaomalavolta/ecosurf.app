import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { IconThumbUp, IconRipple, IconWaveSine, IconWind, IconCamera, IconFlag, IconChevronLeft, IconChevronRight, IconShare, IconCalendar, IconX, IconPhoto, IconMaximize } from '@tabler/icons-react'
import type { EventoVento, Foto, PontoMare } from '../types/domain'
import { corFrescor, frescor, horaCurta, horaDoDia, rotuloFrescor } from '../lib/time'
import { rotuloVento } from '../lib/surf'
import { denunciarFoto } from '../services/moderacao'
import { soComFotosAtivo, setSoComFotos as gravarSoComFotos, autoplayVideosAtivo } from '../lib/preferencias'
import { Photo } from './Photo'
import { VisualizadorMidia } from './VisualizadorMidia'
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

/** Janela navegável da timeline: ±30 dias em torno de hoje. */
function diasDaSemana(hoje: Date): Date[] {
  const dias: Date[] = []
  for (let i = -30; i <= 30; i++) {
    const d = new Date(hoje)
    d.setDate(d.getDate() + i)
    d.setHours(0, 0, 0, 0)
    dias.push(d)
  }
  return dias
}

function dateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

const botaoAmpliar: React.CSSProperties = {
  position: 'absolute', bottom: 10, right: 10,
  width: 34, height: 34, borderRadius: '50%', border: 'none',
  background: 'rgba(0,0,0,.5)', color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
}

export function TideScrubTimeline({
  picoId,
  picoNome,
  fotos,
  curva,
  curvasMultiDia,
  eventos,
  initialFotoId,
  diasComFoto,
  onDiaChange,
}: {
  picoId?: string
  picoNome?: string
  fotos: Foto[]
  curva: PontoMare[]
  curvasMultiDia?: Record<string, PontoMare[]>
  eventos: EventoVento[]
  initialFotoId?: string
  /** Dias (yyyy-mm-dd) com foto no período — pontinhos e calendário. */
  diasComFoto?: Set<string>
  /** Avisa quando o usuário navega para outro dia (para carga sob demanda). */
  onDiaChange?: (diaKey: string) => void
}) {
  /* ── TODOS OS HOOKS PRIMEIRO (antes de qualquer return condicional) ── */

  const hoje = useMemo(() => new Date(), [])
  const todasHoje = useMemo(() => dateKey(hoje), [hoje])

  const dias = useMemo(() => {
    const dMap = new Map<string, Date>()
    // 1. Janela padrão: ±30 dias (a máquina do tempo da maré/fotos)
    for (const d of diasDaSemana(hoje)) {
      dMap.set(dateKey(d), d)
    }
    // 2. Dias com fotos
    fotos.forEach(f => {
      const dk = dateKey(f.capturadaEm)
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

  const [calAberto, setCalAberto] = useState(false)
  const tabsRef = useRef<HTMLDivElement>(null)

  // "Só dias com fotos": poupa o desliza-desliza por dias vazios na régua e
  // nas setas. Persistido na conta (preferências) — mesma chave do Perfil.
  const [soComFotos, setSoComFotos] = useState<boolean>(() => soComFotosAtivo())
  const alternarSoComFotos = useCallback(() => {
    setSoComFotos(v => {
      const nv = !v
      gravarSoComFotos(nv)
      return nv
    })
  }, [])

  const [selectedDiaKey, setSelectedDiaKey] = useState<string>(() => {
    if (initialFotoId) {
      const ft = fotos.find(f => f.id === initialFotoId)
      if (ft) return dateKey(ft.capturadaEm)
    }
    return todasHoje
  })

  const selecionarDia = useCallback((key: string) => {
    setSelectedDiaKey(key)
    onDiaChange?.(key)
  }, [onDiaChange])

  // Régua de 61 dias: centraliza o dia ativo. Scroll direto no CONTAINER
  // (não scrollIntoView): (a) nunca rola a página junto; (b) no iOS a
  // animação suave de scrollIntoView não é interrompível pelo dedo — a
  // régua "ignorava" o swipe do usuário até terminar. Instantâneo no
  // primeiro render; suave nas trocas seguintes; e nunca durante um toque.
  const tocandoRegua = useRef(false)
  const jaCentralizou = useRef(false)
  useEffect(() => {
    const cont = tabsRef.current
    if (!cont || tocandoRegua.current) return
    const el = cont.querySelector('.tide-day-tab.active') as HTMLElement | null
    if (!el) return
    const destino = el.offsetLeft - (cont.clientWidth - el.clientWidth) / 2
    cont.scrollTo({ left: Math.max(0, destino), behavior: jaCentralizou.current ? 'smooth' : 'auto' })
    jaCentralizou.current = true
  }, [selectedDiaKey, soComFotos])

  const hasInitialized = useRef(false)
  useEffect(() => {
    if (initialFotoId && !hasInitialized.current) {
      const ft = fotos.find(f => f.id === initialFotoId)
      if (ft) {
        setSelectedDiaKey(dateKey(ft.capturadaEm))
        hasInitialized.current = true
      }
    }
  }, [initialFotoId, fotos])

  const diaIdx = useMemo(() => {
    const idx = dias.findIndex(d => dateKey(d) === selectedDiaKey)
    return idx !== -1 ? idx : dias.findIndex(d => dateKey(d) === todasHoje)
  }, [dias, selectedDiaKey, todasHoje])

  const diaAtual = dias[diaIdx] ?? hoje
  const diaKey = dateKey(diaAtual)

  // Lista exibida na régua e percorrida pelas setas. Com o filtro ativo,
  // só dias com foto (atuais ou históricas) — mais o hoje e o dia aberto,
  // que nunca somem debaixo do usuário.
  const diasVisiveis = useMemo(() => {
    if (!soComFotos) return dias
    const comFoto = new Set<string>()
    fotos.forEach(f => comFoto.add(dateKey(f.capturadaEm)))
    const filtrados = dias.filter(d => {
      const k = dateKey(d)
      return comFoto.has(k) || diasComFoto?.has(k) || k === todasHoje || k === selectedDiaKey
    })
    return filtrados.length > 0 ? filtrados : dias
  }, [dias, soComFotos, fotos, diasComFoto, todasHoje, selectedDiaKey])

  const idxVisivel = useMemo(() => {
    const i = diasVisiveis.findIndex(d => dateKey(d) === diaKey)
    return i !== -1 ? i : 0
  }, [diasVisiveis, diaKey])

  const curvaDoDia = useMemo(() => {
    if (curvasMultiDia?.[diaKey]) return curvasMultiDia[diaKey]
    return curva
  }, [curva, curvasMultiDia, diaKey])

  const fotosEfetivas = useMemo(
    () => fotos.filter(f => dateKey(f.capturadaEm) === diaKey),
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

  const initAtivo = useMemo(() => {
    if (initialFotoId && ordenadas.length > 0) {
      const idx = ordenadas.findIndex(f => f.id === initialFotoId)
      if (idx !== -1) return idx
    }
    return idxMaisProximoDeAgora
  }, [initialFotoId, ordenadas, idxMaisProximoDeAgora])

  const [ativo, setAtivo] = useState(initAtivo)
  const [ampliada, setAmpliada] = useState(false)
  const autoplayVideos = autoplayVideosAtivo()
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

  useEffect(() => { setAtivo(initAtivo) }, [initAtivo])

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
  
  const safeAtivo = Math.min(ativo, Math.max(0, ordenadas.length - 1))
  const f = ordenadas[safeAtivo] ?? null
  const fr = f ? frescor(f.capturadaEm) : null

  async function denunciar(id: string) {
    try { await denunciarFoto(id); setDenunciadas((d) => ({ ...d, [id]: true })) } catch { /* */ }
  }

  /* ── EARLY RETURNS (depois de TODOS os hooks) ── */



  /* ── RENDER ── */

  return (
    <>
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
              {f.ehVideo && f.videoUrl ? (
                <>
                  <video
                    src={f.videoUrl}
                    poster={f.url}
                    muted
                    loop
                    playsInline
                    autoPlay={autoplayVideos}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onClick={(e) => {
                      const el = e.currentTarget
                      if (el.paused) void el.play().catch(() => {})
                      else el.pause()
                    }}
                  />
                  {/* Ampliar: leva ao visualizador em tela cheia (com som e
                      controles). Separado do toque de play/pause do vídeo. */}
                  <button
                    onClick={() => setAmpliada(true)}
                    aria-label="Ampliar vídeo"
                    style={botaoAmpliar}
                  >
                    <IconMaximize size={16} stroke={2} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setAmpliada(true)}
                  aria-label="Ampliar foto"
                  style={{ position: 'absolute', inset: 0, border: 'none', padding: 0, background: 'none', cursor: 'zoom-in', width: '100%', height: '100%' }}
                >
                  <Photo seed={f.id} url={f.url} alt={f.observacao ?? 'Foto do pico'} style={{ width: '100%', height: '100%' }} />
                </button>
              )}
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
              <span className="dado">{horaCurta(f.capturadaEm)}</span> · {f.autorId ? (
                <Link to={`/usuario/${f.autorId}`} style={{ color: '#fff', textDecoration: 'underline', textUnderlineOffset: 2 }}>{f.autorNome}</Link>
              ) : f.autorNome}
            </span>
            {fr && <span className="tag" style={{ background: 'rgba(255,255,255,.92)', color: corFrescor(fr) }}>● {rotuloFrescor(fr)}</span>}
          </div>

          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 12px 12px', color: '#fff', background: 'linear-gradient(to top, rgba(11,58,83,.88), transparent)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <ProvenanceBadge p={f.procedencia} />
              {f.alturaMareM != null && <span className="tag mar dado"><IconWaveSine size={13} stroke={2.2} /> {f.alturaMareM.toFixed(1)}m</span>}
              {f.ventoTipo && <span className="tag" style={{ background: 'rgba(255,255,255,.9)', color: 'var(--azul-abissal)' }}><IconWind size={13} stroke={2.2} /> {rotuloVento(f.ventoTipo)}</span>}
            </div>
            <div className="between">
              {f.observacao ? <div style={{ fontSize: 14, fontWeight: 600 }}>{f.observacao}</div> : <span />}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button onClick={async () => { try { const { curtirFoto } = await import('../services/supabase/rest'); await curtirFoto(f.id); setCurtidasMap(m => ({ ...m, [f.id]: (m[f.id] || 0) + 1 })) } catch { const { toast } = await import('../lib/toast'); toast('Entre na sua conta para curtir — e tente de novo.', 'info') } }} aria-label="Curtir foto"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.16)', border: 0, color: '#fff', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <IconThumbUp size={14} stroke={2} /> {curtidasMap[f.id] || 0}
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

      {/* RÉGUA DE DIAS (±30) + CALENDÁRIO DE SALTO */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
        <button
          className="btn outline ic"
          aria-label="Escolher dia no calendário"
          onClick={() => setCalAberto(true)}
          style={{ flexShrink: 0, alignSelf: 'center' }}
        >
          <IconCalendar size={18} stroke={2} />
        </button>
        <button
          className={soComFotos ? 'btn ic' : 'btn outline ic'}
          aria-pressed={soComFotos}
          aria-label="Mostrar só dias com fotos"
          title="Só dias com fotos"
          onClick={alternarSoComFotos}
          style={{ flexShrink: 0, alignSelf: 'center' }}
        >
          <IconPhoto size={18} stroke={2} />
        </button>
        <div
          className="tide-day-tabs"
          role="tablist"
          aria-label="Dias do período"
          ref={tabsRef}
          style={{ flex: 1, minWidth: 0 }}
          onTouchStart={() => { tocandoRegua.current = true }}
          onTouchEnd={() => { setTimeout(() => { tocandoRegua.current = false }, 400) }}
        >
          {diasVisiveis.map((d) => {
            const key = dateKey(d)
            const fotosNoDia = fotos.filter(f2 => dateKey(f2.capturadaEm) === key)
            const temHistorico = fotosNoDia.length === 0 && diasComFoto?.has(key)
            const isHoje = key === todasHoje
            const isAtivo = key === selectedDiaKey
            return (
              <button key={key} role="tab" aria-selected={isAtivo}
                className={`tide-day-tab ${isAtivo ? 'active' : ''} ${isHoje ? 'hoje' : ''}`}
                onClick={() => selecionarDia(key)}>
                <span className="tide-day-label">{labelDia(d, hoje)}</span>
                {fotosNoDia.length > 0 && <span className="tide-day-badge">{fotosNoDia.length}</span>}
                {temHistorico && <span className="tide-day-dot" aria-label="Tem fotos" />}
              </button>
            )
          })}
        </div>
      </div>

      {calAberto && (
        <CalendarioSalto
          dias={dias}
          hoje={hoje}
          selecionado={selectedDiaKey}
          diasComFoto={diasComFoto}
          fotos={fotos}
          onEscolher={(k) => { selecionarDia(k); setCalAberto(false) }}
          onFechar={() => setCalAberto(false)}
        />
      )}

      {/* Date paginator */}
      <div className="between" style={{ padding: '0 20px', marginTop: 16 }}>
        <button className="btn outline ic" onClick={() => selecionarDia(dateKey(diasVisiveis[Math.max(0, idxVisivel - 1)]))} disabled={idxVisivel === 0} aria-label="Dia anterior"><IconChevronLeft size={18} /></button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--azul-escuro)' }}>{labelDia(diaAtual, hoje)}</span>
        </div>
        <button className="btn outline ic" onClick={() => selecionarDia(dateKey(diasVisiveis[Math.min(diasVisiveis.length - 1, idxVisivel + 1)]))} disabled={idxVisivel === diasVisiveis.length - 1} aria-label="Próximo dia"><IconChevronRight size={18} /></button>
      </div>

      {/* Bubbles horizontais */}
      <div style={{ padding: '0 20px', marginTop: 15, zIndex: 10, position: 'relative' }}>
        {fotosEfetivas.length > 0 ? null : (
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.7)', borderRadius: 12, textAlign: 'center' }}>
            <p className="muted" style={{ marginBottom: 10, fontSize: 14 }}>Sem relatos neste dia.</p>
            {fotos.length > 0 && (() => {
              const globalOrdenadas = [...fotos].sort((a, b) => b.capturadaEm.localeCompare(a.capturadaEm))
              const ultimaFoto = globalOrdenadas[0]
              const dk = dateKey(ultimaFoto.capturadaEm)
              if (dk !== diaKey) {
                return (
                  <button className="btn" onClick={() => selecionarDia(dk)} style={{ margin: '0 auto' }}>
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
                  <span key={v} className="dado" style={{
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

              {/* Grade horizontal sutil (leitura de altura sem esforço) */}
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} x1={0} x2={VB_W} y1={6 + f * 30} y2={6 + f * 30}
                  stroke="rgba(255,255,255,.07)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
              ))}
              {/* Marcas de hora (6h · 12h · 18h) */}
              {[6, 12, 18].map((h) => (
                <line key={h} x1={x(h)} x2={x(h)} y1={VB_H - 3} y2={VB_H}
                  stroke="rgba(255,255,255,.22)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
              ))}
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

            {/* Eixo de horas: orientação temporal objetiva */}
            {[0, 6, 12, 18, 24].map((h) => (
              <span key={`hx-${h}`} className="dado" style={{
                position: 'absolute',
                bottom: 4,
                left: `${(h / 24) * 100}%`,
                transform: h === 0 ? 'none' : h === 24 ? 'translateX(-100%)' : 'translateX(-50%)',
                fontSize: 8.5, fontWeight: 600,
                color: 'var(--muted)', opacity: 0.55,
                pointerEvents: 'none',
              }}>
                {h === 24 ? '24h' : `${h}h`}
              </span>
            ))}

            {/* Chip de leitura ao arrastar: a maré exata sob o dedo */}
            {scrubHora != null && (
              <span className="dado" style={{
                position: 'absolute',
                left: `${(scrubHora / 24) * 100}%`,
                top: Math.max(2, 28 + topPx(alturaNaHora(curvaDoDia, scrubHora)) - 30),
                transform: 'translateX(-50%)',
                background: '#0D6EA8',
                color: '#fff',
                borderRadius: 9,
                padding: '3px 9px',
                fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap',
                boxShadow: '0 3px 10px rgba(0,0,0,.35)',
                pointerEvents: 'none', zIndex: 6,
              }}>
                {alturaNaHora(curvaDoDia, scrubHora).toFixed(2)}m · {fmtHora(scrubHora)}
              </span>
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
                    <span className="dado">{p.alturaM.toFixed(1)}m · {fmtHora(p.hora)}</span>
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
                  {(ft.thumbUrl ?? ft.url) && (
                    <img src={ft.thumbUrl ?? ft.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: '50%' }} />
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
                <span className="dado">{fmtHora(scrubHora)} · {alturaNaHora(curvaDoDia, scrubHora).toFixed(1)}m</span>
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
            <IconWaveSine size={13} stroke={2.2} /> <span className="dado">{alturaNaHora(curvaDoDia, scrubHora ?? agoraH).toFixed(1)}m</span>
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

    {ampliada && f && (
      <VisualizadorMidia
        fotos={ordenadas}
        indiceInicial={safeAtivo}
        picoNome={picoNome}
        onFechar={() => setAmpliada(false)}
      />
    )}
    </>
  )
}

/**
 * Calendário de salto: visão mensal do período (±30 dias) para pular direto
 * a um dia — vendo de relance quais dias têm foto (pontinho). Maré existe
 * para todos os dias (tábua oficial); foto, só onde a comunidade registrou.
 */
function CalendarioSalto({ dias, hoje, selecionado, diasComFoto, fotos, onEscolher, onFechar }: {
  dias: Date[]
  hoje: Date
  selecionado: string
  diasComFoto?: Set<string>
  fotos: Foto[]
  onEscolher: (key: string) => void
  onFechar: () => void
}) {
  const hojeKey = dateKey(hoje)
  const fotosPorDia = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of fotos) {
      const k = dateKey(f.capturadaEm)
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [fotos])

  // agrupa o período por mês, preservando a ordem
  const meses = useMemo(() => {
    const m = new Map<string, Date[]>()
    for (const d of dias) {
      const k = `${d.getFullYear()}-${d.getMonth()}`
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(d)
    }
    return [...m.values()]
  }, [dias])

  const nomeMes = (d: Date) =>
    d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())

  return (
    <div
      role="dialog"
      aria-label="Escolher dia"
      onClick={onFechar}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(4,20,27,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: 'min(440px, 100%)', maxHeight: '78dvh', overflowY: 'auto', borderRadius: '18px 18px 0 0', padding: '14px 16px 22px' }}
      >
        <div className="between" style={{ marginBottom: 6 }}>
          <h3 style={{ fontSize: 16 }}>Navegar no tempo</h3>
          <button onClick={onFechar} aria-label="Fechar" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--muted)' }}>
            <IconX size={20} stroke={2} />
          </button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Maré oficial para todos os dias · pontinho = dia com foto da comunidade
        </p>
        {meses.map((ds) => (
          <div key={dateKey(ds[0])} style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{nomeMes(ds[0])}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {/* alinhamento: células vazias até o dia da semana do primeiro dia */}
              {Array.from({ length: ds[0].getDay() }).map((_, i) => <span key={`v${i}`} />)}
              {ds.map((d) => {
                const k = dateKey(d)
                const n = fotosPorDia.get(k) ?? 0
                const tem = n > 0 || diasComFoto?.has(k)
                const ativo = k === selecionado
                const ehHoje = k === hojeKey
                return (
                  <button
                    key={k}
                    onClick={() => onEscolher(k)}
                    aria-label={`${d.getDate()} ${tem ? '(tem fotos)' : ''}`}
                    style={{
                      aspectRatio: '1', borderRadius: 10, cursor: 'pointer',
                      border: ehHoje ? '1.5px solid var(--turq)' : '1px solid var(--line)',
                      background: ativo ? 'var(--turq)' : 'transparent',
                      color: ativo ? '#fff' : 'inherit',
                      fontWeight: ehHoje || ativo ? 700 : 500,
                      fontSize: 13, position: 'relative',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {d.getDate()}
                    {tem && (
                      <span style={{ position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: '50%', background: ativo ? '#fff' : 'var(--turq)' }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
