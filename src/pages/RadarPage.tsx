import { useEffect, useMemo, useState } from 'react'
import { IconStar, IconRipple, IconMapPin } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { SpotCard } from '../components/SpotCard'
import { carregarPicos, ehFavorito } from '../services/picos'
import { buscarForecast } from '../services/forecast'
import { nota } from '../lib/surf'
import { temBackend } from '../services/api'
import type { Forecast, Pico } from '../types/domain'

type Filtro = 'favoritos' | 'melhores' | 'todos'

export function RadarPage() {
  const [filtro, setFiltro] = useState<Filtro>('favoritos')
  const [picosTodos, setPicosTodos] = useState<Pico[]>([])
  const [fc, setFc] = useState<Record<string, Forecast>>({})

  useEffect(() => {
    let vivo = true
    carregarPicos().then((ps) => {
      if (!vivo) return
      setPicosTodos(ps)
      Promise.all(ps.map(async (p) => [p.id, await buscarForecast(p)] as const)).then((es) => {
        if (vivo) setFc(Object.fromEntries(es))
      })
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
