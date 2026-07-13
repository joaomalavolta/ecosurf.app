import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from 'react'
import { lerPreferencia, gravarPreferencia } from '../services/preferencias-conta'
import { PainelPreferencias } from '../components/PreferenciasEConquistas'
import { Link } from 'react-router-dom'
import { IconSettings, IconUsersGroup, IconCompass, IconThumbUp, IconMenu2, IconUserHeart, IconStar, IconRipple, IconMapPin, IconChevronRight, IconList, IconChevronDown, IconWorld, IconSnowboarding } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { StoryBubbles } from '../components/StoryBubbles'
import { CarrosselRegiao } from '../components/CarrosselRegiao'
import { TiraComunidades } from '../components/TiraComunidades'
import { SkeletonFeedCard } from '../components/Skeleton'
import { TourInicial } from '../components/TourInicial'
import { VazioFeed } from '../components/VazioFeed'
import { FeedCard } from '../components/FeedCard'
import { carregarPicos, carregarAmeacas, carregarMutiroes, carregarPicosComRelato } from '../services/picos'
import { carregarFavoritos, toggleFavorito } from '../services/favoritos'
import { buscarForecast } from '../services/forecast'
import { carregarFeedGlobal } from '../services/feed'
import { temBackend } from '../services/api'
import { MapViewLazy as MapView } from '../map/MapViewLazy'
import type { Alerta, Forecast, Mutirao, Pico, Foto } from '../types/domain'

type Filtro = 'favoritos' | 'melhores' | 'todos' | 'seguindo'
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
  const [filtro, setFiltroEstado] = useState<Filtro>(() => {
    const salvo = lerPreferencia<string>('feed', 'filtroInicial', 'todos')
    return (['favoritos', 'melhores', 'todos', 'seguindo'] as const).includes(salvo as Filtro)
      ? (salvo as Filtro)
      : 'todos'
  })
  // O Radar abre na última aba usada — "escolhe uma vez, o app lembra sempre".
  const setFiltro = useCallback((f: Filtro) => {
    setFiltroEstado(f)
    gravarPreferencia('feed', 'filtroInicial', f)
  }, [])
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
  const [seguidos, setSeguidos] = useState<Set<string>>(new Set())
  const [carregandoFeed, setCarregandoFeed] = useState(true)
  const [verTour, setVerTour] = useState(false)
  const [menuTerritorio, setMenuTerritorio] = useState(false)
  const [verPrefs, setVerPrefs] = useState(false)
  const [ufMenu, setUfMenu] = useState<string | null>(null)
  const [destinoMapa, setDestinoMapa] = useState<{ lng: number; lat: number; zoom?: number } | null>(null)
  const [filtroMapa, setFiltroMapa] = useState<FiltroMapa>('ecosurf')
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void carregarFavoritos().then(setFavoritos)
    import('../services/seguindo').then(({ carregarSeguindo }) => carregarSeguindo().then(setSeguidos)).catch(() => {})
  }, [])

  // Modo portal (desktop): só esta rota alarga o shell — as outras páginas
  // continuam na coluna mobile até ganharem seus próprios layouts.
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
      setCarregandoFeed(false)
      try {
        const { getCurtidas } = await import('../services/supabase/rest')
        const likes = await Promise.all(fs.map(async f => [f.id, await getCurtidas(f.id)] as const))
        if (vivo) setCurtidasMap(Object.fromEntries(likes))
      } catch { /* curtidas são opcionais: segue sem elas */ }
    })
    carregarFeedGlobal(50).catch(() => vivo && setCarregandoFeed(false))
    carregarAmeacas().then((a) => vivo && setAlertas(a))
    carregarMutiroes().then((m) => vivo && setMutiroes(m))
    carregarPicosComRelato().then((ids) => vivo && setAtivos(new Set(ids)))
    import('../components/TourInicial').then(({ jaViuTour }) => {
      if (!jaViuTour()) setTimeout(() => vivo && setVerTour(true), 1400)
    })
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
    if (filtro === 'seguindo') {
      return entries
        .map(([picoId, fotos]) => [picoId, fotos.filter((f) => f.autorId && seguidos.has(f.autorId))] as [string, typeof fotos])
        .filter(([, fotos]) => fotos.length > 0)
    }
    return entries
  }, [filtro, fotosPorPico, favoritos, seguidos])

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

  return (
    <div className="radar-map-first">
      {/* ─── HEADER RADAR — padrão com onda ─── */}
      <Header brand sub="Surfar Global e Agir Local" />

      {/* ─── MAPA (hero) ─── */}
      <div className="radar-col-mapa">
      <div className={`radar-map-container ${mapaExpandido ? 'expanded' : ''}`}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <Suspense fallback={<div style={{ background: 'var(--map-bg)', width: '100%', height: '100%' }} />}>
            <button
              aria-label="Navegar por estado e cidade"
              onClick={() => { setMenuTerritorio(true); setUfMenu(null) }}
              style={{
                position: 'absolute', top: 10, left: 10, zIndex: 4,
                width: 38, height: 38, borderRadius: 12, border: '1px solid rgba(255,255,255,.16)',
                background: 'rgba(28,32,36,.52)', backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconMenu2 size={19} stroke={2} />
            </button>

            {menuTerritorio && (
              <div
                onClick={() => setMenuTerritorio(false)}
                style={{ position: 'absolute', inset: 0, zIndex: 5, background: 'rgba(4,20,27,.45)', display: 'flex' }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 'min(240px, 76%)', height: '100%', overflowY: 'auto',
                    background: 'rgba(24,28,32,.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                    borderRight: '1px solid rgba(255,255,255,.14)', padding: '12px 10px',
                  }}
                >
                  <div className="between" style={{ padding: '0 6px 8px' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
                      <IconMapPin size={14} stroke={2} style={{ verticalAlign: '-2px' }} /> {ufMenu ?? 'Litoral por região'}
                    </span>
                    {ufMenu && (
                      <button onClick={() => setUfMenu(null)} style={{ background: 'none', border: 0, color: 'rgba(255,255,255,.7)', fontSize: 12, cursor: 'pointer' }}>← UFs</button>
                    )}
                  </div>
                  {!ufMenu && [...new Set(picosTodos.map((p) => p.uf))].sort().map((u) => (
                    <button key={u} className="menu-terr-item" onClick={() => setUfMenu(u)}>
                      {u} <span style={{ opacity: .55, fontSize: 11 }}>{picosTodos.filter((p) => p.uf === u).length} picos</span>
                    </button>
                  ))}
                  {ufMenu && [...new Set(picosTodos.filter((p) => p.uf === ufMenu).map((p) => p.municipio))].sort().map((c) => (
                    <button
                      key={c}
                      className="menu-terr-item"
                      onClick={() => {
                        const ps = picosTodos.filter((p) => p.uf === ufMenu && p.municipio === c)
                        if (ps.length > 0) {
                          const lng = ps.reduce((sm, p) => sm + p.lng, 0) / ps.length
                          const lat = ps.reduce((sm, p) => sm + p.lat, 0) / ps.length
                          setDestinoMapa({ lng, lat, zoom: 12 })
                        }
                        setMenuTerritorio(false)
                      }}
                    >
                      {c}
                    </button>
                  ))}
                  <Link
                    to={ufMenu ? `/explorar?uf=${encodeURIComponent(ufMenu)}` : '/explorar'}
                    style={{ display: 'block', textAlign: 'center', color: '#7FDCD4', fontSize: 12, padding: '12px 6px 6px', textDecoration: 'none' }}
                  >
                    <IconCompass size={13} stroke={2} style={{ verticalAlign: '-2px' }} /> Abrir Explorar completo →
                  </Link>

                  {/* Ações da comunidade — o território acima, o que fazer com
                      ele aqui. No Perfil isso ficava enterrado. */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,.14)', marginTop: 10, paddingTop: 10 }}>
                    <Link
                      to="/comunidades/nova"
                      onClick={() => setMenuTerritorio(false)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 8px', borderRadius: 10,
                        color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                        background: 'rgba(30,203,195,.14)',
                        border: '1px solid rgba(30,203,195,.3)',
                      }}
                    >
                      <IconUsersGroup size={16} stroke={2} style={{ color: '#7FE7E1', flexShrink: 0 }} />
                      Criar comunidade
                    </Link>
                    <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 10.5, lineHeight: 1.4, margin: '8px 4px 2px' }}>
                      Reúna pessoas em torno de uma praia, projeto ou causa.
                    </p>
                    <button
                      onClick={() => { setMenuTerritorio(false); setVerPrefs(true) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '10px 8px', borderRadius: 10, marginTop: 8,
                        color: '#fff', fontSize: 13, fontWeight: 600,
                        background: 'none', border: '1px solid rgba(255,255,255,.14)',
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}
                    >
                      <IconSettings size={16} stroke={2} style={{ flexShrink: 0, opacity: .85 }} />
                      Preferências do app
                    </button>
                  </div>
                </div>
              </div>
            )}

            <MapView
              picos={picosTodos}
              alertas={alertas}
              mutiroes={mutiroes}
              ativos={ativos}
              destino={destinoMapa}
              atividade={feed.map((f) => ({ picoId: f.picoId, em: f.capturadaEm }))}
              scrubberAncora="topo"
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
      </div>

      <div className="radar-col-feed">
      <StoryBubbles fotos={feed} picos={picosTodos} />

      <TiraComunidades />

      {/* ─── FEED SECTION ─── */}
      <div className="pills full rolavel" role="tablist" aria-label="Filtro do radar" style={{ margin: '10px 12px 6px' }}>
        <Pill on={filtro === 'favoritos'} onClick={() => setFiltro('favoritos')}><IconStar size={15} stroke={2} /> Favoritos</Pill>
        <Pill on={filtro === 'melhores'} onClick={() => setFiltro('melhores')}><IconRipple size={15} stroke={2} /> Curtidas</Pill>
          <Pill on={filtro === 'seguindo'} onClick={() => setFiltro('seguindo')}><IconUserHeart size={15} stroke={2} /> Seguindo</Pill>
        <Pill on={filtro === 'todos'} onClick={() => setFiltro('todos')}><IconMapPin size={15} stroke={2} /> Todos</Pill>
      </div>

      <CarrosselRegiao alertas={alertas} mutiroes={mutiroes} />
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
                  <div className="badge b-good" style={{ fontSize: 15, padding: '4px 10px' }}><IconThumbUp size={15} stroke={2} /> {curtidasMap[f.id] || 0}</div>
                </div>
              </Link>
            )
          })
        ) : (
          <>
            {feed.length === 0 && picosTodos.length === 0 && (
              <p className="muted" style={{ textAlign: 'center' }}>Carregando picos…</p>
            )}

            <div style={{ padding: '10px 16px 2px' }}>
              <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconRipple size={12} stroke={2} /> O mar agora · fotos da comunidade nos picos</span>
            </div>

            {carregandoFeed && feed.length === 0 && (
              <><SkeletonFeedCard /><SkeletonFeedCard /></>
            )}
            {!carregandoFeed && feed.length === 0 && picosTodos.length > 0 && (
              <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Sem fotos hoje</p>
                <p className="muted">Seja o primeiro a registrar o mar! As fotos da comunidade aparecem aqui em tempo real.</p>
              </div>
            )}

            {feedCards.length === 0 && feed.length > 0 && filtro !== 'todos' && (
              <div style={{ margin: '0 16px' }}>
                <VazioFeed filtro={filtro} feed={feed} seguidos={seguidos} />
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

            <Link to="/explorar" className="btn outline full" style={{ margin: '4px 16px 0', width: 'calc(100% - 32px)' }}>
              <IconCompass size={16} stroke={2} /> Explorar o litoral por estado e cidade
            </Link>

            {picosSemFoto.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button
                  className={`pico-list-toggle ${listaPicosAberta ? 'open' : ''}`}
                  onClick={() => setListaPicosAberta(!listaPicosAberta)}
                >
                  <IconList size={16} stroke={2} />
                  <IconList size={15} stroke={2} style={{ verticalAlign: '-2px' }} /> Todos os picos ({picosSemFoto.length} sem foto)
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

      </div>
      {verTour && <TourInicial onFechar={() => setVerTour(false)} />}
      {/* Preferências — o mesmo painel do Perfil, aberto do hambúrguer do mapa */}
      {verPrefs && (
        <div
          onClick={() => setVerPrefs(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(4,20,27,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 100%)', padding: '0 12px 14px' }}>
            <PainelPreferencias onFechar={() => setVerPrefs(false)} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Faixa de maré do portal (desktop): a curva do dia da estação mais próxima. */

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`pill ${on ? 'active' : ''}`} onClick={onClick} role="tab" aria-selected={on}>
      {children}
    </button>
  )
}
