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
      <div style={{ padding: 16 }}>
        <div className="between">
          <div>
            <h3 style={{ fontSize: 18 }}>{pico.nome}</h3>
            <div className="muted">{pico.praia} · {pico.municipio}/{pico.uf}</div>
          </div>
          {forecast && <span className="badge b-info">{rotularCondicao(forecast.ondaM, forecast.vento.tipo)}</span>}
        </div>
        {forecast && (
          <div className="insight" style={{ marginTop: 14, marginBottom: 14, display: 'flex', alignItems: 'center' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path><path d="M12 12l-3 -2"></path><path d="M12 7v5"></path></svg>
            <div style={{ flex: 1 }}>Melhor janela: <b>6h–9h</b></div>
            <div style={{ width: 36, height: 18, position: 'relative', borderBottom: '1px solid var(--line)' }}>
              <svg viewBox="0 0 36 18" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                {forecast.ondaM > 1 ? (
                  <path d="M0 14 Q 9 18, 18 8 T 36 2" fill="none" stroke="var(--turq)" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M0 8 Q 9 2, 18 8 T 36 14" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
            </div>
          </div>
        )}
        {forecast && <ForecastStrip f={forecast} />}
      </div>
    </Link>
  )
}
