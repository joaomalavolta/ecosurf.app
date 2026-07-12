import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconShieldCheck, IconPhoto, IconShare, IconStar, IconClock } from '@tabler/icons-react'
import { compartilharPico } from './TideScrubTimeline'
import type { Foto, Forecast, Pico } from '../types/domain'
import { rotularCondicao } from '../lib/surf'

/**
 * Card feed-first: a foto é protagonista, o pico é metadata.
 * Carrossel swipeable com dots quando há mais de uma foto.
 */
function rotuloQuando(iso: string): string {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1)
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (d.toDateString() === hoje.toDateString()) return `hoje · ${hora}`
  if (d.toDateString() === ontem.toDateString()) return `ontem · ${hora}`
  // Sempre com mês (dia sozinho é ambíguo); ano só quando não é o corrente.
  const dia = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
  const ano = d.getFullYear() !== hoje.getFullYear() ? ` ${d.getFullYear()}` : ''
  return `${dia}${ano} · ${hora}`
}

export function FeedCard({
  fotos,
  pico,
  forecast,
  favorito,
  onToggleFavorito,
}: {
  fotos: Foto[]
  pico?: Pico
  forecast?: Forecast
  favorito?: boolean
  onToggleFavorito?: () => void
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
      to={`/pico/${fotos[0].picoId}?foto=${fotosComUrl[activeIdx]?.id ?? fotos[0]?.id}`}
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
        {onToggleFavorito && (
          <button
            aria-label={favorito ? 'Remover dos favoritos' : 'Favoritar pico'}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorito() }}
            style={{
              position: 'absolute', top: 10, right: 10, zIndex: 3,
              width: 36, height: 36, borderRadius: 12, border: 0, cursor: 'pointer',
              background: 'rgba(4,20,27,.5)', color: favorito ? '#FFD34D' : 'rgba(255,255,255,.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconStar size={19} stroke={2} fill={favorito ? '#FFD34D' : 'none'} />
          </button>
        )}
        <div className="feed-overlay-badges">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {/* Crédito visível: quem fez o report */}
            {(() => {
              const f = fotosComUrl[activeIdx]
              if (!f?.autorNome) return null
              // Assinada por comunidade? O crédito é do grupo (cantos retos no
              // avatar diferenciam de uma pessoa à primeira vista).
              const ehCom = !!f.comunidadeNome
              const nome = ehCom ? f.comunidadeNome! : f.autorNome
              const avatar = ehCom ? f.comunidadeAvatar : f.autorAvatar
              return (
                <span className="badge b-glass" style={{ fontSize: 10.5, paddingLeft: 4 }}>
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      style={{ width: 18, height: 18, borderRadius: ehCom ? 6 : 99, objectFit: 'cover', border: '1px solid rgba(255,255,255,.4)' }}
                    />
                  ) : (
                    <span style={{
                      width: 18, height: 18, borderRadius: ehCom ? 6 : 99, background: 'rgba(255,255,255,.25)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {nome[0]?.toUpperCase()}
                    </span>
                  )}
                  {nome}
                </span>
              )
            })()}
            {fotosComUrl[activeIdx]?.procedencia === 'no-local' && (
              <span className="badge b-glass" style={{ fontSize: 10 }}>
                <IconShieldCheck size={12} stroke={2} /> no local
              </span>
            )}
          </span>
          {/* condição vive no gradiente de baixo — aqui só autor + procedência,
              senão o selo briga com a estrela de favorito no canto direito */}
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

        {/* Herói: dados flutuam sobre a foto */}
        <div className="feed-hero-grad">
          <div className="between" style={{ alignItems: 'flex-end' }}>
            <div style={{ minWidth: 0 }}>
              <h3 className="disp" style={{ fontSize: 21, lineHeight: 1.1, margin: 0, textShadow: '0 1px 8px rgba(0,0,0,.4)' }}>{nome}</h3>
              {local && <div style={{ fontSize: 12, opacity: .85, marginTop: 2 }}>{local}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                {forecast && (
                  <span className="badge b-info" style={{ fontSize: 10.5 }}>
                    {rotularCondicao(forecast.ondaM, forecast.vento.tipo)}
                  </span>
                )}
                {forecast && (
                  <span className="dado" style={{ fontSize: 13, fontWeight: 700 }}>
                    {forecast.ondaM.toFixed(1)}m · {forecast.periodoS}s · {forecast.vento.tipo}
                  </span>
                )}
                {fotosComUrl[activeIdx]?.capturadaEm && (
                  <span className="dado" style={{ fontSize: 11, opacity: .9, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <IconClock size={12} stroke={2} /> {rotuloQuando(fotosComUrl[activeIdx].capturadaEm)}
                  </span>
                )}
                {fotosComUrl.length > 1 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, opacity: .85 }}>
                    <IconPhoto size={13} stroke={2} /> {fotosComUrl.length}
                  </span>
                )}
              </div>
            </div>
            <button
              className="share-btn acao"
              style={{ background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: 10, flexShrink: 0 }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                compartilharPico(fotos[0].picoId, pico?.nome ?? fotos[0].picoId, forecast ? rotularCondicao(forecast.ondaM, forecast.vento.tipo) : undefined)
              }}
              aria-label="Compartilhar pico"
            >
              <IconShare size={13} stroke={2} /> Enviar
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
