import { Link } from 'react-router-dom'
import { IconAlertTriangle, IconUsers, IconCalendarEvent } from '@tabler/icons-react'
import { categoriaPorId } from './SeletorCategoria'
import type { ItemEcoFeed } from '../lib/mesclarFeed'
import type { CategoriaAlerta } from '../types/domain'

const COR_GRAVIDADE: Record<string, string> = {
  emergencial: '#D64045', alta: '#E8734A', media: '#E8A05C', baixa: '#3E8C6B',
}

/**
 * Card de alerta/mutirão no PADRÃO do feed: mesma foto-herói 4/5 e os mesmos
 * gradientes topo/base do FeedCard — só que o protagonista é a ocorrência
 * ambiental. Sem foto, um pôster com o gradiente da categoria e o ícone.
 */
export function EcoFeedCard({ item }: { item: ItemEcoFeed }) {
  const ehAlerta = item.tipo === 'alerta'
  const cat = ehAlerta && item.categoria ? categoriaPorId(item.categoria as CategoriaAlerta) : null
  const Icone = ehAlerta ? (cat?.icone ?? IconAlertTriangle) : IconUsers
  const cor = ehAlerta ? (COR_GRAVIDADE[item.gravidade ?? 'media'] ?? '#E8A05C') : '#2E9B6B'

  return (
    <Link
      to={ehAlerta ? `/alerta/${item.id}` : `/mutirao/${item.id}`}
      className="card"
      style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <div className="feed-carousel">
        <div className="feed-carousel-track">
          {item.imagemUrl ? (
            <img src={item.imagemUrl} alt={item.titulo} loading="lazy" />
          ) : (
            <div
              style={{
                flex: '0 0 100%', width: '100%', aspectRatio: '4 / 5', maxHeight: 520,
                display: 'grid', placeItems: 'center',
                background: `linear-gradient(150deg, ${cor} 0%, #0D3B54 100%)`,
              }}
            >
              <Icone size={76} stroke={1.4} color="rgba(255,255,255,.9)" />
            </div>
          )}
        </div>

        {/* TOPO: tipo (sobrancelha) + título + local — a tag fica ACIMA do
            título, no fluxo, pra nunca sobrepor como no canto absoluto. */}
        <div className="feed-top-grad">
          <div style={{ marginBottom: 8 }}>
            <span
              className="badge b-glass"
              style={{
                fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4,
                background: `color-mix(in srgb, ${cor} 60%, rgba(4,20,27,.5))`,
              }}
            >
              {ehAlerta ? <><IconAlertTriangle size={11} stroke={2.5} /> Alerta</> : <><IconUsers size={11} stroke={2.5} /> Mutirão</>}
            </span>
          </div>
          <h3 className="disp" style={{ fontSize: 21, lineHeight: 1.1, margin: 0, textShadow: '0 1px 8px rgba(0,0,0,.4)' }}>{item.titulo}</h3>
          <div style={{ fontSize: 12, opacity: .85, marginTop: 2 }}>{item.municipio}{item.uf ? `/${item.uf}` : ''}</div>
        </div>

        {/* BASE: gravidade/quando + crédito */}
        <div className="feed-hero-grad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {ehAlerta ? (
              <span className="badge" style={{ fontSize: 10.5, fontWeight: 700, background: cor, color: '#fff', textTransform: 'capitalize' }}>
                <IconAlertTriangle size={11} stroke={2.5} /> {item.gravidade ?? 'média'}
              </span>
            ) : item.quandoTxt ? (
              <span className="badge b-glass" style={{ fontSize: 10.5, fontWeight: 700 }}>
                <IconCalendarEvent size={11} stroke={2.5} /> {item.quandoTxt}
              </span>
            ) : null}
            {item.autorNome && (
              <span className="badge b-glass" style={{ fontSize: 10.5, paddingLeft: 4 }}>
                {item.autorFoto ? (
                  <img src={item.autorFoto} alt="" style={{ width: 18, height: 18, borderRadius: 99, objectFit: 'cover', border: '1px solid rgba(255,255,255,.4)' }} />
                ) : (
                  <span style={{ width: 18, height: 18, borderRadius: 99, background: 'rgba(255,255,255,.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                    {item.autorNome[0]?.toUpperCase()}
                  </span>
                )}
                {item.autorNome}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
