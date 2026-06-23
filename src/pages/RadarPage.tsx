import { useEffect, useMemo, useState } from 'react'
import { IconStar, IconRipple, IconMapPin } from '@tabler/icons-react'
import { Header } from '../components/Header'

import { SpotCard } from '../components/SpotCard'
import { carregarPicos, ehFavorito } from '../services/picos'
import { buscarForecast } from '../services/forecast'
import { carregarFeedGlobal } from '../services/feed'
import { nota } from '../lib/surf'
import { temBackend } from '../services/api'
import type { Forecast, Pico, Foto } from '../types/domain'

type Filtro = 'favoritos' | 'melhores' | 'todos'

export function RadarPage() {
  const [filtro, setFiltro] = useState<Filtro>('favoritos')
  const [picosTodos, setPicosTodos] = useState<Pico[]>([])
  const [fc, setFc] = useState<Record<string, Forecast>>({})
  const [feed, setFeed] = useState<Foto[]>([])

  useEffect(() => {
    let vivo = true
    carregarPicos().then((ps) => {
      if (!vivo) return
      setPicosTodos(ps)
      Promise.all(ps.map(async (p) => [p.id, await buscarForecast(p)] as const)).then((es) => {
        if (vivo) setFc(Object.fromEntries(es))
      })
    })
    carregarFeedGlobal(15).then((fs) => {
      if (vivo) setFeed(fs)
    })
    return () => {
      vivo = false
    }
  }, [])

  const picos = useMemo(() => {
    if (filtro === 'favoritos') {
      const favs = picosTodos.filter((p) => ehFavorito(p.id))
      return favs.length ? favs : picosTodos
    }
    if (filtro === 'melhores') {
      return [...picosTodos].sort((a, b) => {
        const fa = fc[a.id]
        const fb = fc[b.id]
        const na = fa ? nota(fa.ondaM, fa.periodoS, fa.vento.tipo) : 0
        const nb = fb ? nota(fb.ondaM, fb.periodoS, fb.vento.tipo) : 0
        return nb - na
      })
    }
    return picosTodos
  }, [filtro, fc, picosTodos])

  return (
    <div className="page">
      <Header brand sub="o surf por quem surfa" />
      
      {feed.length > 0 && (
        <div style={{ margin: '16px 0', overflowX: 'auto', display: 'flex', gap: 12, padding: '0 16px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {feed.map((f) => {
            const pico = picosTodos.find(p => p.id === f.picoId)
            return (
              <a key={f.id} href={`/pico/${f.picoId}`} style={{ flexShrink: 0, width: 72, textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: 999, padding: 3, background: 'var(--grad-ocean)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                  <img src={f.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 999, border: '2px solid var(--bg)' }} />
                </div>
                <div style={{ fontSize: 11, textAlign: 'center', marginTop: 8, color: 'var(--text)', fontWeight: 600, width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pico?.nome || f.picoId}
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{f.autorNome.split(' ')[0]}</div>
              </a>
            )
          })}
        </div>
      )}

      <div className="page-pad stack">
        <div className="pills" role="tablist" aria-label="Filtro do radar">
          <Pill on={filtro === 'favoritos'} onClick={() => setFiltro('favoritos')}><IconStar size={15} stroke={2} /> Favoritos</Pill>
          <Pill on={filtro === 'melhores'} onClick={() => setFiltro('melhores')}><IconRipple size={15} stroke={2} /> Melhores agora</Pill>
          <Pill on={filtro === 'todos'} onClick={() => setFiltro('todos')}><IconMapPin size={15} stroke={2} /> Todos</Pill>
        </div>

        {picosTodos.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>Carregando picos…</p>}

        {picos.map((p) => (
          <SpotCard key={p.id} pico={p} forecast={fc[p.id]} />
        ))}

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
