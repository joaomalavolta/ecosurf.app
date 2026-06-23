import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconStar, IconRipple, IconMapPin, IconChevronRight, IconList } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { StoryBubbles } from '../components/StoryBubbles'
import { FeedCard } from '../components/FeedCard'
import { carregarPicos, ehFavorito } from '../services/picos'
import { buscarForecast } from '../services/forecast'
import { carregarFeedGlobal } from '../services/feed'
import { temBackend } from '../services/api'
import type { Forecast, Pico, Foto } from '../types/domain'

type Filtro = 'favoritos' | 'melhores' | 'todos'

/** Agrupa fotos por picoId, preservando ordem (mais recentes primeiro). */
function agruparPorPico(fotos: Foto[]): Map<string, Foto[]> {
  const map = new Map<string, Foto[]>()
  for (const f of fotos) {
    let arr = map.get(f.picoId)
    if (!arr) {
      arr = []
      map.set(f.picoId, arr)
    }
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
      } catch {}
    })
    return () => {
      vivo = false
    }
  }, [])

  const picoMap = useMemo(() => {
    const m = new Map<string, Pico>()
    for (const p of picosTodos) m.set(p.id, p)
    return m
  }, [picosTodos])

  const fotosPorPico = useMemo(() => agruparPorPico(feed), [feed])

  // Feed cards: picos com foto, filtrados conforme seleção
  const feedCards = useMemo(() => {
    const entries = Array.from(fotosPorPico.entries())
    if (filtro === 'favoritos') {
      return entries.filter(([picoId]) => ehFavorito(picoId))
    }
    return entries // 'todos'
  }, [filtro, fotosPorPico])

  // Melhores ondas: ranking por curtidas
  const melhoresOndas = useMemo(() => {
    return [...feed].sort((a, b) => {
      const cA = curtidasMap[a.id] || 0
      const cB = curtidasMap[b.id] || 0
      if (cA === cB) return new Date(b.capturadaEm).getTime() - new Date(a.capturadaEm).getTime()
      return cB - cA
    })
  }, [feed, curtidasMap])

  // Picos SEM foto (para a lista colapsável secundária)
  const picosSemFoto = useMemo(() => {
    return picosTodos.filter((p) => !fotosPorPico.has(p.id))
  }, [picosTodos, fotosPorPico])

  return (
    <div className="page">
      <Header brand sub="o surf por quem surfa" />

      {/* Stories bubbles — por autor+pico */}
      <StoryBubbles fotos={feed} picos={picosTodos} />

      <div className="page-pad stack">
        <div className="pills" role="tablist" aria-label="Filtro do radar">
          <Pill on={filtro === 'favoritos'} onClick={() => setFiltro('favoritos')}><IconStar size={15} stroke={2} /> Favoritos</Pill>
          <Pill on={filtro === 'melhores'} onClick={() => setFiltro('melhores')}><IconRipple size={15} stroke={2} /> Melhores ondas</Pill>
          <Pill on={filtro === 'todos'} onClick={() => setFiltro('todos')}><IconMapPin size={15} stroke={2} /> Todos</Pill>
        </div>

        {filtro === 'melhores' ? (
          melhoresOndas.length === 0 ? <p className="muted" style={{ textAlign: 'center' }}>Carregando ondas...</p> :
          melhoresOndas.map(f => {
            const pico = picoMap.get(f.picoId)
            return (
              <a href={`/pico/${f.picoId}`} key={`onda-${f.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: 0, overflow: 'hidden' }}>
                <img src={f.url} alt="Onda" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{pico?.nome || f.picoId}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Por {f.autorNome}</div>
                  </div>
                  <div className="badge b-good" style={{ fontSize: 15, padding: '4px 10px' }}>🤙 {curtidasMap[f.id] || 0}</div>
                </div>
              </a>
            )
          })
        ) : (
          <>
            {/* Estado vazio */}
            {feed.length === 0 && picosTodos.length === 0 && (
              <p className="muted" style={{ textAlign: 'center' }}>Carregando picos…</p>
            )}

            {feed.length === 0 && picosTodos.length > 0 && (
              <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>📷 Sem fotos hoje</p>
                <p className="muted">Seja o primeiro a registrar o mar! As fotos da comunidade aparecem aqui em tempo real.</p>
              </div>
            )}

            {/* Feed cards — foto como protagonista */}
            {feedCards.map(([picoId, fotos]) => (
              <FeedCard
                key={picoId}
                fotos={fotos}
                pico={picoMap.get(picoId)}
                forecast={fc[picoId]}
              />
            ))}

            {/* Lista secundária colapsável: picos sem foto */}
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
                          <span className="badge b-info" style={{ fontSize: 10 }}>
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
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`pill ${on ? 'active' : ''}`} onClick={onClick} role="tab" aria-selected={on}>
      {children}
    </button>
  )
}
