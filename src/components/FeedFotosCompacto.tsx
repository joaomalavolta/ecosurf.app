import { Link } from 'react-router-dom'
import { IconCamera, IconRipple } from '@tabler/icons-react'
import type { Foto, Pico } from '../types/domain'

/**
 * Feed compacto de fotos para a aba "Fotos" do painel de inteligência
 * (desktop, dashboard-mapa). Reusa as fotos que a MapaPage já carrega —
 * não duplica a lógica rica do Radar (curtidas, filtros); é uma vitrine
 * cronológica enxuta que leva ao pico ao clicar. O feed completo continua
 * no Radar (/radar).
 */

const tempoRelativo = (iso: string): string => {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function FeedFotosCarrossel({ fotos, picoMap }: { fotos: Foto[]; picoMap: Map<string, Pico> }) {
  const comUrl = fotos.filter((f) => f.url)
  if (comUrl.length === 0) {
    return (
      <div className="card pad" style={{ textAlign: 'center', padding: '22px 18px' }}>
        <IconCamera size={26} stroke={1.7} style={{ color: 'var(--turq)', marginBottom: 6 }} />
        <p className="muted" style={{ fontSize: 13 }}>Sem fotos ainda hoje. As fotos da comunidade nos picos aparecem aqui.</p>
      </div>
    )
  }
  return (
    <div className="feed-carrossel">
      {comUrl.map((f) => {
        const pico = picoMap.get(f.picoId)
        return (
          <Link key={f.id} to={`/pico/${f.picoId}`} className="feed-carrossel-item">
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: 'linear-gradient(135deg, #0D6EA8, #2E9BD6)' }}>
              <img src={f.url} alt={pico ? `Foto em ${pico.nome}` : 'Foto da comunidade'} loading="lazy"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 10px 7px', background: 'linear-gradient(transparent, rgba(6,34,46,.82))', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, textShadow: '0 1px 3px rgba(0,0,0,.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <IconRipple size={12} stroke={2} style={{ flexShrink: 0 }} /> {pico?.nome ?? 'Pico'}
                </span>
                <span className="dado" style={{ color: 'rgba(255,255,255,.9)', fontSize: 10.5, textShadow: '0 1px 3px rgba(0,0,0,.4)', flexShrink: 0 }}>{tempoRelativo(f.capturadaEm)}</span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
