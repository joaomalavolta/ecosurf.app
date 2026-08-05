import { IconRipple, IconWorld, IconSnowboarding } from '@tabler/icons-react'

export type Lente = 'ecosurf' | 'eco' | 'surf'

/**
 * Segmented control Eco / Ecosurf / Surf — a "lente" do app. Eco = ambiental,
 * Surf = ondas, Ecosurf = os dois. Usado no mapa e no feed do Radar, cada um
 * com seu próprio estado (mapa e feed filtram de forma independente).
 */
export function SegFiltroEcosurf({
  valor,
  onChange,
}: {
  valor: Lente
  onChange: (l: Lente) => void
}) {
  return (
    <div className="seg-filter" style={{ margin: '10px 12px' }}>
      <div
        className="seg-filter-thumb"
        style={{
          left: `calc(${valor === 'eco' ? 0 : valor === 'ecosurf' ? 1 : 2} * 33.333% + 3px)`,
          background: valor === 'eco' ? '#22c55e' : valor === 'surf' ? '#0D6EA8' : 'linear-gradient(135deg, #22c55e, #0D6EA8)',
        }}
      />
      <button className={`seg-filter-btn ${valor === 'eco' ? 'on' : ''}`} onClick={() => onChange('eco')}>
        <IconRipple size={15} stroke={2} /> Eco
      </button>
      <button className={`seg-filter-btn ${valor === 'ecosurf' ? 'on' : ''}`} onClick={() => onChange('ecosurf')}>
        <IconWorld size={15} stroke={2} /> Ecosurf
      </button>
      <button className={`seg-filter-btn ${valor === 'surf' ? 'on' : ''}`} onClick={() => onChange('surf')}>
        <IconSnowboarding size={15} stroke={2} /> Surf
      </button>
    </div>
  )
}
