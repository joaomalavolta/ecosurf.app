import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { IconAlertTriangle, IconUsers } from '@tabler/icons-react'
import { FeedCard } from './FeedCard'
import { categoriaPorId } from './SeletorCategoria'
import { restEcoRecentes, type ItemEco } from '../services/eco'
import type { Foto, Pico, Forecast, CategoriaAlerta } from '../types/domain'

const COR_GRAVIDADE: Record<string, string> = {
  emergencial: '#D64045', alta: '#E8734A', media: '#E8A05C', baixa: '#8FA6AD',
}

/** Card de um item ambiental (alerta ou mutirão) na lista/timeline. */
function CardEco({ item }: { item: ItemEco }) {
  const ehAlerta = item.tipo === 'alerta'
  const cat = ehAlerta && item.categoria ? categoriaPorId(item.categoria as CategoriaAlerta) : null
  const Icone = cat?.icone ?? IconUsers
  const cor = ehAlerta ? (COR_GRAVIDADE[item.gravidade ?? 'media'] ?? '#8FA6AD') : '#2E9B6B'
  return (
    <Link
      to={ehAlerta ? `/alerta/${item.id}` : `/mutirao/${item.id}`}
      className="card"
      style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, textDecoration: 'none', color: 'inherit' }}
    >
      <span style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center', overflow: 'hidden', background: `color-mix(in srgb, ${cor} 16%, transparent)` }}>
        {item.imagemUrl
          ? <img src={item.imagemUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Icone size={22} stroke={1.8} color={cor} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titulo}</span>
        <span className="muted" style={{ fontSize: 12 }}>{item.municipio}{item.uf ? `/${item.uf}` : ''}</span>
      </span>
      <span className="badge" style={{ fontSize: 10.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor, flexShrink: 0 }}>
        {ehAlerta
          ? <><IconAlertTriangle size={11} stroke={2.5} /> {item.gravidade ?? 'média'}</>
          : <><IconUsers size={11} stroke={2.5} /> {item.quandoTxt ?? 'mutirão'}</>}
      </span>
    </Link>
  )
}

/** Agrupa fotos por pico preservando a ordem (mais recentes primeiro). */
function agrupar(fotos: Foto[]): [string, Foto[]][] {
  const m = new Map<string, Foto[]>()
  for (const f of fotos) {
    const arr = m.get(f.picoId)
    if (arr) arr.push(f)
    else m.set(f.picoId, [f])
  }
  return [...m.entries()]
}

interface FeedLenteProps {
  lente: 'eco' | 'ecosurf'
  feed: Foto[]
  picoMap: Map<string, Pico>
  fc: Record<string, Forecast>
  favoritos: Set<string>
  onToggleFavorito: (picoId: string) => void
}

/**
 * Corpo do feed nas lentes Eco e Ecosurf.
 *  - eco: só itens ambientais (alertas + mutirões), mais novos primeiro.
 *  - ecosurf: fluxo único intercalado por tempo — fotos de onda e itens
 *    ambientais no mesmo scroll, cada um ancorado no seu instante.
 */
export function FeedLente({ lente, feed, picoMap, fc, favoritos, onToggleFavorito }: FeedLenteProps) {
  const [eco, setEco] = useState<ItemEco[]>([])
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    let vivo = true
    restEcoRecentes(30).then((is) => {
      if (vivo) { setEco(is); setCarregando(false) }
    })
    return () => { vivo = false }
  }, [])

  const gruposSurf = useMemo(() => agrupar(feed), [feed])

  // Timeline intercalada: cada pico-card ancorado no tempo da sua foto mais
  // recente; cada item eco no seu ts. Merge por recência (mais novo no topo).
  const timeline = useMemo(() => {
    const nos: { ts: number; key: string; node: ReactNode }[] = []
    for (const [picoId, fotos] of gruposSurf) {
      const ts = Math.max(...fotos.map((f) => new Date(f.capturadaEm).getTime()))
      nos.push({
        ts,
        key: `surf-${picoId}`,
        node: (
          <div id={`feed-card-${picoId}`}>
            <FeedCard
              fotos={fotos}
              pico={picoMap.get(picoId)}
              forecast={fc[picoId]}
              favorito={favoritos.has(picoId)}
              onToggleFavorito={() => onToggleFavorito(picoId)}
            />
          </div>
        ),
      })
    }
    for (const item of eco) {
      nos.push({ ts: item.ts, key: `eco-${item.id}`, node: <CardEco item={item} /> })
    }
    return nos.sort((a, b) => b.ts - a.ts)
  }, [gruposSurf, eco, picoMap, fc, favoritos, onToggleFavorito])

  if (lente === 'eco') {
    if (carregando && eco.length === 0) {
      return <p className="muted" style={{ textAlign: 'center', padding: 16 }}>Carregando alertas…</p>
    }
    if (eco.length === 0) {
      return (
        <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Sem alertas ambientais agora</p>
          <p className="muted">Nada reportado por aqui. Viu algo? Registre um alerta e mobilize a rede.</p>
        </div>
      )
    }
    return <div className="stack">{eco.map((item) => <CardEco key={`eco-${item.id}`} item={item} />)}</div>
  }

  // ecosurf — timeline intercalada
  if (timeline.length === 0) {
    if (carregando) return <p className="muted" style={{ textAlign: 'center', padding: 16 }}>Carregando o Ecosurf…</p>
    return (
      <div className="card pad" style={{ textAlign: 'center', padding: '28px 16px' }}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Tudo quieto por aqui</p>
        <p className="muted">Ainda não há ondas nem alertas. Seja o primeiro a registrar o mar!</p>
      </div>
    )
  }
  return <div className="stack">{timeline.map((n) => <div key={n.key}>{n.node}</div>)}</div>
}
