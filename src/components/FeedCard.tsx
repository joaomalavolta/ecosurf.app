import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconShieldCheck, IconPhoto } from '@tabler/icons-react'
import type { Foto, Forecast, Pico } from '../types/domain'
import { rotularCondicao } from '../lib/surf'
import { ForecastStrip } from './ForecastStrip'

/**
 * Card feed-first: a foto é protagonista, o pico é metadata.
 * Carrossel swipeable com dots quando há mais de uma foto.
 */
export function FeedCard({
  fotos,
  pico,
  forecast,
}: {
  fotos: Foto[]
  pico?: Pico
  forecast?: Forecast
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  // Detect which photo is visible via scroll position
  const handleScroll = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const w = el.clientWidth
    if (w === 0) return
    const idx = Math.round(el.scrollLeft / w)
    setActiveIdx(idx)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const scrollTo = useCallback((idx: number) => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
  }, [])

  const fotosComUrl = fotos.filter((f) => !!f.url)
  if (fotosComUrl.length === 0) return null

  const nome = pico?.nome ?? fotos[0]?.picoId ?? 'Pico'
  const local = pico ? `${pico.praia} · ${pico.municipio}/${pico.uf}` : ''

  return (
    <Link
      to={`/pico/${fotos[0].picoId}`}
      className="card"
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      {/* Carrossel de fotos */}
      <div className="feed-carousel">
        <div className="feed-carousel-track" ref={trackRef}>
          {fotosComUrl.map((f) => (
            <img key={f.id} src={f.url!} alt={`Foto de ${nome}`} loading="lazy" />
          ))}
        </div>

        {/* Badges overlay */}
        <div className="feed-overlay-badges">
          <span>
            {fotosComUrl[activeIdx]?.procedencia === 'no-local' && (
              <span className="badge b-glass" style={{ fontSize: 10 }}>
                <IconShieldCheck size={12} stroke={2} /> no local
              </span>
            )}
          </span>
          {forecast && (
            <span className="badge b-info">
              {rotularCondicao(forecast.ondaM, forecast.vento.tipo)}
            </span>
          )}
        </div>

        {/* Dots */}
        {fotosComUrl.length > 1 && (
          <div className="feed-dots">
            {fotosComUrl.map((f, i) => (
              <button
                key={f.id}
                className={`feed-dot ${i === activeIdx ? 'active' : ''}`}
                aria-label={`Foto ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  scrollTo(i)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: 16 }}>
        <div className="between">
          <div>
            <h3 style={{ fontSize: 18 }}>{nome}</h3>
            {local && <div className="muted">{local}</div>}
          </div>
          {fotosComUrl.length > 1 && (
            <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <IconPhoto size={14} stroke={2} /> {fotosComUrl.length}
            </span>
          )}
        </div>

        {forecast && (
          <>
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
            <ForecastStrip f={forecast} />
          </>
        )}
      </div>
    </Link>
  )
}
