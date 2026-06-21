import { useEffect, useMemo, useState } from 'react'
import { IconStar, IconRipple, IconMapPin } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { SpotCard } from '../components/SpotCard'
import { favoritos, listarPicos } from '../services/picos'
import { buscarForecast } from '../services/forecast'
import { nota } from '../lib/surf'
import type { Forecast } from '../types/domain'

type Filtro = 'favoritos' | 'melhores' | 'todos'

export function RadarPage() {
  const [filtro, setFiltro] = useState<Filtro>('favoritos')
  const [fc, setFc] = useState<Record<string, Forecast>>({})

  useEffect(() => {
    let vivo = true
    Promise.all(listarPicos().map(async (p) => [p.id, await buscarForecast(p)] as const)).then((es) => {
      if (vivo) setFc(Object.fromEntries(es))
    })
    return () => {
      vivo = false
    }
  }, [])

  const picos = useMemo(() => {
    if (filtro === 'favoritos') return favoritos()
    const todos = listarPicos()
    if (filtro === 'melhores') {
      return [...todos].sort((a, b) => {
        const fa = fc[a.id]
        const fb = fc[b.id]
        const na = fa ? nota(fa.ondaM, fa.periodoS, fa.vento.tipo) : 0
        const nb = fb ? nota(fb.ondaM, fb.periodoS, fb.vento.tipo) : 0
        return nb - na
      })
    }
    return todos
  }, [filtro, fc])

  return (
    <div className="page">
      <Header title="Ecosurf" sub="O mar de hoje, pela lente de quem está lá. Litoral Sul de SP." />
      <div className="page-pad stack">
        <div className="pills" role="tablist" aria-label="Filtro do radar">
          <Pill on={filtro === 'favoritos'} onClick={() => setFiltro('favoritos')}><IconStar size={15} stroke={2} /> Favoritos</Pill>
          <Pill on={filtro === 'melhores'} onClick={() => setFiltro('melhores')}><IconRipple size={15} stroke={2} /> Melhores agora</Pill>
          <Pill on={filtro === 'todos'} onClick={() => setFiltro('todos')}><IconMapPin size={15} stroke={2} /> Todos</Pill>
        </div>

        {picos.map((p) => (
          <SpotCard key={p.id} pico={p} forecast={fc[p.id]} />
        ))}

        <p className="muted" style={{ textAlign: 'center', padding: '4px 16px' }}>
          Previsão via Open-Meteo · maré ainda em modelo (trocar por DHN).
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
