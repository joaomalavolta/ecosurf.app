import { Link } from 'react-router-dom'
import { IconPlayerPlayFilled, IconAlertTriangle, IconUsers } from '@tabler/icons-react'
import { categoriaPorId } from './SeletorCategoria'
import type { Foto, Pico } from '../types/domain'
import type { TileMosaico, ItemEcoFeed } from '../lib/mesclarFeed'

const COR_GRAVIDADE: Record<string, string> = {
  emergencial: '#D64045', alta: '#E8734A', media: '#E8A05C', baixa: '#3E8C6B',
}

/**
 * Feed em mosaico — 3 colunas de miniaturas, para varredura visual rápida do
 * litoral. Mostra fotos E ocorrências ambientais (alertas/mutirões) como tiles,
 * pra que o mosaico não fique só de ondas. Cada tile abre seu destino.
 */
export function MosaicoFeed({
  tiles,
  picoMap,
}: {
  tiles: TileMosaico[]
  picoMap: Map<string, Pico>
}) {
  if (tiles.length === 0) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 3,
      padding: '2px 3px',
    }}>
      {tiles.map((t) => t.tipo === 'eco'
        ? <TileEco key={`eco-${t.item.id}`} item={t.item} />
        : <TileFoto key={t.foto.id} foto={t.foto} pico={picoMap.get(t.foto.picoId)} />)}
    </div>
  )
}

/** Tile de foto (o mosaico clássico): abre a foto na página do pico. */
function TileFoto({ foto: f, pico }: { foto: Foto; pico?: Pico }) {
  return (
    <Link
      to={`/pico/${f.picoId}?foto=${f.id}`}
      style={{
        position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden',
        borderRadius: 6, display: 'block', background: gradienteDe(f.picoId),
      }}
    >
      {f.thumbUrl && (
        <img
          src={f.thumbUrl}
          alt={pico?.nome ?? 'registro'}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}

      {/* Selo de vídeo — sem ele, um clipe pareceria foto no mosaico */}
      {f.ehVideo && (
        <span style={{
          position: 'absolute', top: 5, right: 5,
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(0,0,0,.55)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <IconPlayerPlayFilled size={11} color="#fff" />
        </span>
      )}

      {/* Rodapé com pico + hora: a leitura honesta de "quando" */}
      <span style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '10px 6px 4px',
        background: 'linear-gradient(transparent, rgba(0,0,0,.7))',
        color: '#fff', fontSize: 9.5, lineHeight: 1.2,
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {pico?.nome ?? '—'}
        </span>
        <span style={{ opacity: .85 }}>{horaCurta(f.capturadaEm)}</span>
      </span>
    </Link>
  )
}

/** Tile de ocorrência ambiental: selo colorido no canto distingue da onda. */
function TileEco({ item }: { item: ItemEcoFeed }) {
  const ehAlerta = item.tipo === 'alerta'
  const cat = ehAlerta && item.categoria ? categoriaPorId(item.categoria) : null
  const ehPositivo = cat?.tipo === 'positivo'
  const Icone = ehAlerta ? (cat?.icone ?? IconAlertTriangle) : IconUsers
  const cor = ehPositivo
    ? cat!.cor
    : ehAlerta ? (COR_GRAVIDADE[item.gravidade ?? 'media'] ?? '#E8A05C') : '#2E9B6B'
  return (
    <Link
      to={ehAlerta ? `/alerta/${item.id}` : `/mutirao/${item.id}`}
      style={{
        position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden',
        borderRadius: 6, display: 'block', background: `linear-gradient(150deg, ${cor} 0%, #0D3B54 100%)`,
      }}
    >
      {item.imagemUrl && (
        <img
          src={item.imagemUrl}
          alt={item.titulo}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}

      {/* Selo eco: círculo colorido (cor da categoria) no canto superior esq */}
      <span style={{
        position: 'absolute', top: 5, left: 5,
        width: 20, height: 20, borderRadius: '50%',
        background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,.4)',
      }}>
        <Icone size={11} color="#fff" stroke={2.4} />
      </span>

      <span style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '10px 6px 4px',
        background: 'linear-gradient(transparent, rgba(0,0,0,.72))',
        color: '#fff', fontSize: 9.5, lineHeight: 1.2,
        display: 'flex', flexDirection: 'column', gap: 1,
      }}>
        <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.titulo}
        </span>
        <span style={{ opacity: .85 }}>{ehAlerta ? 'Alerta' : 'Mutirão'}{item.municipio ? ` · ${item.municipio}` : ''}</span>
      </span>
    </Link>
  )
}

/** Hora local curta (HH:MM) do registro. */
function horaCurta(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Gradiente determinístico por pico — fundo quando não há miniatura. */
function gradienteDe(picoId: string): string {
  let h = 0
  for (let i = 0; i < picoId.length; i++) h = (h * 31 + picoId.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h}, 45%, 30%), hsl(${(h + 40) % 360}, 45%, 22%))`
}
