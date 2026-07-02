import { useEffect, useMemo, useState, useRef, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { IconStar, IconRipple, IconMapPin, IconChevronRight, IconList, IconSearch, IconChevronDown, IconWorld, IconSnowboarding } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { StoryBubbles } from '../components/StoryBubbles'
import { ImpactoComunidade } from '../components/ImpactoComunidade'
import { FeedCard } from '../components/FeedCard'
import { carregarPicos, carregarAmeacas, carregarMutiroes, carregarPicosComRelato } from '../services/picos'
import { carregarFavoritos, toggleFavorito } from '../services/favoritos'
import { buscarForecast } from '../services/forecast'
import { carregarFeedGlobal } from '../services/feed'
import { temBackend } from '../services/api'
import { MapView } from '../map/MapView'
import type { Alerta, Forecast, Mutirao, Pico, Foto } from '../types/domain'

type Filtro = 'favoritos' | 'melhores' | 'todos'
type FiltroMapa = 'ecosurf' | 'eco' | 'surf'

/** Agrupa fotos por picoId, preservando ordem (mais recentes primeiro). */
function agruparPorPico(fotos: Foto[]): Map<string, Foto[]> {
  const map = new Map<string, Foto[]>()
  for (const f of fotos) {
    let arr = map.get(f.picoId)
    if (!arr) { arr = []; map.set(f.picoId, arr) }
    arr.push(f)
  }
  return map
}

export function RadarPage() {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [picosTodos, setPicosTodos] = useState<Pico[]>([])
  const [fc, setFc] = useState<Record<string, Forecast>>({})
  const [feed, setFeed] = useState<Foto[]>([])
  const [curtidasMap, setCurtidasMap] = useState<Record<string, number>>({})
  const [listaPicosAberta, setListaPicosAberta] = useState(false)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [mutiroes, setMutiroes] = useState<Mutirao[]>([])
  const [ativos, setAtivos] = useState<Set<string>>(new Set())
  const [selPico, setSelPico] = useState<Pico | null>(null)
  const [mapaExpandido, setMapaExpandido] = useState(false)
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set())
  const [filtroMapa, setFiltroMapa] = useState<FiltroMapa>('ecosurf')
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void carregarFavoritos().then(setFavoritos)
  }, [])

  // Modo portal (desktop): só esta rota alarga o shell — as outras páginas
  // continuam na coluna mobile até ganharem seus próprios layouts.
  useEffect(() => {
    document.body.dataset.portal = '1'
    return () => { delete document.body.dataset.portal }
  }, [])

  useEffect(() => {
    let vivo = true
    carregarPicos().then((ps) => {
      if (!vivo) return
      setPicosTodos(ps)
      Promise.all(ps.map(async (p) => [p.id, await buscarForecast(p)] as const)).then((es) => {
        if (vivo) setFc(Object.fromEntries(es))
      })
    })
    carregarFeedGlobal(50).then(async (fs) => {
      if (!vivo) return
      setFeed(fs)
      try {
        const { getCurtidas } = await import('../services/supabase/rest')
        const likes = await Promise.all(fs.map(async f => [f.id, await getCurtidas(f.id)] as const))
        if (vivo) setCurtidasMap(Object.fromEntries(likes))
      } catch { /* curtidas são opcionais: segue sem elas */ }
    })
    carregarAmeacas().then((a) => vivo && setAlertas(a))
    carregarMutiroes().then((m) => vivo && setMutiroes(m))
    carregarPicosComRelato().then((ids) => vivo && setAtivos(new Set(ids)))
    return () => { vivo = false }
  }, [])

  const picoMap = useMemo(() => {
    const m = new Map<string, Pico>()
    for (const p of picosTodos) m.set(p.id, p)
    return m
  }, [picosTodos])

  const fotosPorPico = useMemo(() => agruparPorPico(feed), [feed])

  const feedCards = useMemo(() => {
    const entries = Array.from(fotosPorPico.entries())
    if (filtro === 'favoritos') {
      return entries.filter(([picoId]) => favoritos.has(picoId))
    }
    return entries
  }, [filtro, fotosPorPico, favoritos])

  const melhoresOndas = useMemo(() => {
    return [...feed].sort((a, b) => {
      const cA = curtidasMap[a.id] || 0
      const cB = curtidasMap[b.id] || 0
      if (cA === cB) return new Date(b.capturadaEm).getTime() - new Date(a.capturadaEm).getTime()
      return cB - cA
    })
  }, [feed, curtidasMap])

  const picosSemFoto = useMemo(() => {
    return picosTodos.filter((p) => !fotosPorPico.has(p.id))
  }, [picosTodos, fotosPorPico])

  // Quando um pico é selecionado no mapa, scroll feed até o card
  const handleSelectPico = (pico: Pico) => {
    setSelPico(pico)
    // Scroll to the feed card if it exists
    setTimeout(() => {
      const el = document.getElementById(`feed-card-${pico.id}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  const picosAtivos = useMemo(
    () => picosTodos.filter((p) => ativos.has(p.id)),
    [picosTodos, ativos],
  )

  return (
    <div className="radar-map-first">
      {/* ─── HEADER RADAR — padrão com onda ─── */}
      <Header brand sub="Surfar Global e Agir Local" />

      {/* ─── MAPA (hero) ─── */}
      <div className="radar-col-mapa">
      <div className={`radar-map-container ${mapaExpandido ? 'expanded' : ''}`}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <Suspense fallback={<div style={{ background: 'var(--map-bg)', width: '100%', height: '100%' }} />}>
            <MapView
              picos={picosTodos}
              alertas={alertas}
              mutiroes={mutiroes}
              ativos={ativos}
              filtro={filtroMapa === 'eco' ? 'alertas' : filtroMapa === 'surf' ? 'picos' : 'tudo'}
              onSelectPico={handleSelectPico}
            />
          </Suspense>
        </div>

        {/* Toggle mapa expandido */}
        <button
          className="radar-map-toggle"
          onClick={() => setMapaExpandido(!mapaExpandido)}
          aria-label={mapaExpandido ? 'Reduzir mapa' : 'Expandir mapa'}
        >
          <IconChevronDown size={18} stroke={2.5} style={{ transform: mapaExpandido ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
        </button>

        {/* Pico selecionado — mini card flutuante */}
        {selPico && (
          <div className="radar-map-selected">
            <Link to={`/pico/${selPico.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{selPico.nome}</div>
              <div className="muted" style={{ fontSize: 12 }}>{selPico.municipio} · {selPico.uf}</div>
            </Link>
            {fc[selPico.id] && (
              <span className="badge b-info dado" style={{ fontSize: 11 }}>
                {fc[selPico.id].ondaM.toFixed(1)}m · {fc[selPico.id].periodoS}s
              </span>
            )}
            <button onClick={() => setSelPico(null)} aria-label="Fechar" style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>×</button>
          </div>
        )}
      </div>

      {/* ─── FILTRO MAPA ─── */}
      <div className="seg-filter" style={{ margin: '10px 12px' }}>
        <div
          className="seg-filter-thumb"
          style={{
            left: `calc(${filtroMapa === 'eco' ? 0 : filtroMapa === 'ecosurf' ? 1 : 2} * 33.333% + 3px)`,
            background: filtroMapa === 'eco' ? '#22c55e' : filtroMapa === 'surf' ? '#0D6EA8' : 'linear-gradient(135deg, #22c55e, #0D6EA8)',
          }}
        />
        <button className={`seg-filter-btn ${filtroMapa === 'eco' ? 'on' : ''}`} onClick={() => setFiltroMapa('eco')}>
          <IconRipple size={15} stroke={2} /> Eco
        </button>
        <button className={`seg-filter-btn ${filtroMapa === 'ecosurf' ? 'on' : ''}`} onClick={() => setFiltroMapa('ecosurf')}>
          <IconWorld size={15} stroke={2} /> Ecosurf
        </button>
        <button className={`seg-filter-btn ${filtroMapa === 'surf' ? 'on' : ''}`} onClick={() => setFiltroMapa('surf')}>
          <IconSnowboarding size={15} stroke={2} /> Surf
        </button>
      </div>
      <TideStripRadar pico={selPico ?? picosTodos[0] ?? null} />
      </div>

      <div className="radar-col-feed">
      <StoryBubbles fotos={feed} picos={picosTodos} />

      {/* ─── FEED SECTION ─── */}
      <div className="pills full" role="tablist" aria-label="Filtro do radar" style={{ margin: '10px 12px' }}>
        <Pill on={filtro === 'favoritos'} onClick={() => setFiltro('favoritos')}><IconStar size={15} stroke={2} /> Favoritos</Pill>
        <Pill on={filtro === 'melhores'} onClick={() => setFiltro('melhores')}><IconRipple size={15} stroke={2} /> Mais Curtidas</Pill>
        <Pill on={filtro === 'todos'} onClick={() => setFiltro('todos')}><IconMapPin size={15} stroke={2} /> Todos</Pill>
      </div>
      <div className="page-pad stack" ref={feedRef}>

        {filtro === 'melhores' ? (
          melhoresOndas.length === 0 ? <p className="muted" style={{ textAlign: 'center' }}>Carregando ondas...</p> :
          melhoresOndas.map(f => {
            const pico = picoMap.get(f.picoId)
            return (
              <Link to={`/pico/${f.picoId}?foto=${f.id}`} key={`onda-${f.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: 0, overflow: 'hidden' }}>
                <img src={f.thumbUrl ?? f.url} alt="Onda" loading="lazy" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{pico?.nome || f.picoId}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Por {f.autorNome}</div>
                  </div>
                  <div className="badge b-good" style={{ fontSize: 15, padding: '4px 10px' }}>🤙 {curtidasMap[f.id] || 0}</div>
                </div>
              </Link>
            )
          })
        ) : (
          <>
            {feed.length === 0 && picosTodos.length === 0 && (
              <p className="muted" style={{ textAlign: 'center' }}>Carregando picos…</p>
            )}

            {feed.length === 0 && picosTodos.length > 0 && (
              <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>📷 Sem fotos hoje</p>
                <p className="muted">Seja o primeiro a registrar o mar! As fotos da comunidade aparecem aqui em tempo real.</p>
              </div>
            )}

            {feedCards.map(([picoId, fotos]) => (
              <div key={picoId} id={`feed-card-${picoId}`}>
                <FeedCard
                  fotos={fotos}
                  pico={picoMap.get(picoId)}
                  forecast={fc[picoId]}
                  favorito={favoritos.has(picoId)}
                  onToggleFavorito={() => {
                    toggleFavorito(picoId)
                    setFavoritos((s) => {
                      const n = new Set(s)
                      if (n.has(picoId)) n.delete(picoId); else n.add(picoId)
                      return n
                    })
                  }}
                />
              </div>
            ))}

            {picosSemFoto.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button
                  className={`pico-list-toggle ${listaPicosAberta ? 'open' : ''}`}
                  onClick={() => setListaPicosAberta(!listaPicosAberta)}
                >
                  <IconList size={16} stroke={2} />
                  📋 Todos os picos ({picosSemFoto.length} sem foto)
                  <IconChevronRight size={14} stroke={2.5} />
                </button>
                {listaPicosAberta && (
                  <div className="stack">
                    {picosSemFoto.map((p) => (
                      <Link key={p.id} to={`/pico/${p.id}`} className="pico-list-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nome}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{p.praia} · {p.municipio}/{p.uf}</div>
                        </div>
                        {fc[p.id] && (
                          <span className="badge b-info dado" style={{ fontSize: 10 }}>
                            {fc[p.id].ondaM.toFixed(1)}m
                          </span>
                        )}
                        <IconChevronRight size={16} stroke={2} style={{ color: 'var(--muted)' }} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <p className="muted" style={{ textAlign: 'center', padding: '4px 16px' }}>
          Previsão via Open-Meteo · picos {temBackend() ? 'do Supabase' : 'do seed local'} · maré em modelo (DHN a fazer).
        </p>
      </div>

      <div className="so-desktop" style={{ margin: '0 16px 12px' }}>
        <ImpactoComunidade alertas={alertas} mutiroes={mutiroes} />
      </div>
      {mutiroes.length > 0 && (
        <div className="so-desktop card pad" style={{ margin: '0 16px 16px' }}>
          <span className="eyebrow">🤝 Próximos mutirões</span>
          <div className="stack" style={{ marginTop: 10 }}>
            {mutiroes.slice(0, 3).map((m) => (
              <Link key={m.id} to={`/mutirao/${m.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.titulo}</div>
                <div className="muted" style={{ fontSize: 12 }}>{m.municipio}/{m.uf} · {m.quando}{m.horario ? ` · ${m.horario}` : ''}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

/** Faixa de maré do portal (desktop): a curva do dia da estação mais próxima. */
function TideStripRadar({ pico }: { pico: Pico | null }) {
  const [pontos, setPontos] = useState<{ hora: number; alturaM: number }[]>([])
  useEffect(() => {
    if (!pico) return
    let vivo = true
    import('../services/tide/provider').then(({ tideProvider }) =>
      tideProvider.curvaDoDia(pico, new Date()).then((c) => vivo && setPontos(c))
    ).catch(() => {})
    return () => { vivo = false }
  }, [pico])

  if (!pico || pontos.length === 0) return null
  const min = Math.min(...pontos.map((p) => p.alturaM))
  const max = Math.max(...pontos.map((p) => p.alturaM))
  const W = 600, H = 54
  const x = (h: number) => (h / 24) * W
  const y = (a: number) => H - 8 - ((a - min) / Math.max(0.01, max - min)) * (H - 18)
  const linha = pontos.map((p) => `${x(p.hora).toFixed(1)},${y(p.alturaM).toFixed(1)}`).join(' ')
  const agoraH = new Date().getHours() + new Date().getMinutes() / 60
  const perto = pontos.reduce((a, b) => Math.abs(b.hora - agoraH) < Math.abs(a.hora - agoraH) ? b : a)
  return (
    <div className="so-desktop card" style={{ margin: '12px 12px 0', padding: '10px 14px 8px' }}>
      <div className="between" style={{ marginBottom: 2 }}>
        <span className="eyebrow">🌊 Maré do dia · {pico.nome}</span>
        <span className="dado" style={{ fontSize: 12, fontWeight: 700, color: 'var(--turq)' }}>agora ≈ {perto.alturaM.toFixed(1)}m</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 54, display: 'block' }} aria-label="Curva de maré do dia">
        <polyline points={linha} fill="none" stroke="var(--turq)" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx={x(agoraH)} cy={y(perto.alturaM)} r="4" fill="var(--turq)" />
      </svg>
      <div className="between">
        <span className="dado muted" style={{ fontSize: 10 }}>00h</span>
        <span className="dado muted" style={{ fontSize: 10 }}>12h</span>
        <span className="dado muted" style={{ fontSize: 10 }}>24h</span>
      </div>
    </div>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`pill ${on ? 'active' : ''}`} onClick={onClick} role="tab" aria-selected={on}>
      {children}
    </button>
  )
}
