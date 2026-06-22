import { Link } from 'react-router-dom'
import type { Forecast, Pico } from '../types/domain'
import { rotularCondicao } from '../lib/surf'
import { Photo } from './Photo'
import { ForecastStrip } from './ForecastStrip'

export function SpotCard({ pico, forecast }: { pico: Pico; forecast?: Forecast }) {
  return (
    <Link
      to={`/pico/${pico.id}`}
      className="card"
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <Photo seed={pico.id} alt={`Mar em ${pico.nome}`} style={{ width: '100%', height: 140 }} />
      <div className="pad">
        <div className="between">
          <div>
            <h3 style={{ fontSize: 18 }}>{pico.nome}</h3>
            <div className="muted">{pico.praia} · {pico.municipio}/{pico.uf}</div>
          </div>
          {forecast && <span className="tag mar">{rotularCondicao(forecast.ondaM, forecast.vento.tipo)}</span>}
        </div>
        {forecast && <ForecastStrip f={forecast} />}
      </div>
    </Link>
  )
}
