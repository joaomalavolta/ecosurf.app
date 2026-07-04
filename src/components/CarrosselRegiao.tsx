import { Link } from 'react-router-dom'
import { IconSeeding, IconAlertTriangle, IconUsers } from '@tabler/icons-react'
import type { Alerta, Mutirao } from '../types/domain'
import { SUPABASE_URL } from '../services/supabase/config'
import { categoriaPorId } from './SeletorCategoria'

/**
 * Mini-carrossel da região: alertas e mutirões com FOTO, num trilho único
 * logo abaixo dos filtros do feed. Substitui as faixas soltas — os reports
 * cívicos ganham palco visual sem competir com as fotos-herói de onda.
 */

const COR_GRAVIDADE: Record<string, string> = {
  critica: '#D64045', alta: '#E8734A', media: '#E8A05C', baixa: '#8FA6AD',
}


const PESO_GRAV: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 }

export function CarrosselRegiao({ alertas, mutiroes }: { alertas: Alerta[]; mutiroes: Mutirao[] }) {
  if (alertas.length === 0 && mutiroes.length === 0) return null

  const alertasOrd = [...alertas]
    .sort((a, b) => (PESO_GRAV[a.gravidade ?? 'media'] ?? 2) - (PESO_GRAV[b.gravidade ?? 'media'] ?? 2))
    .slice(0, 8)

  return (
    <>
      <div className="between" style={{ padding: '6px 16px 0' }}>
        <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconSeeding size={12} stroke={2} /> Agir local · alertas e mutirões</span>
      </div>
      <div className="carrossel-regiao">
      {alertasOrd.map((a) => {
        const cat = categoriaPorId(a.categoria)
        const IconeCat = cat.icone
        const img = a.images?.[0]
        const cor = COR_GRAVIDADE[a.gravidade ?? 'media'] ?? '#8FA6AD'
        return (
          <Link key={`a-${a.id}`} to={`/alerta/${a.id}`} className="cr-card">
            <div className="cr-foto" style={{ background: `linear-gradient(150deg, ${cat.cor}, rgba(6,34,46,.92))` }}>
              {img
                ? <img src={`${SUPABASE_URL}/storage/v1/object/public/fotos/${img}`} alt="" loading="lazy" />
                : <IconeCat size={30} stroke={1.8} color="rgba(255,255,255,.92)" />}
              <span className="cr-chip" style={{ background: cor }}>
                <IconAlertTriangle size={10} stroke={2.5} /> {a.gravidade ?? 'média'}
              </span>
            </div>
            <span className="cr-titulo">{a.titulo}</span>
            <span className="cr-sub">{a.municipio}{a.uf ? `/${a.uf}` : ''}</span>
          </Link>
        )
      })}

      {mutiroes.slice(0, 8).map((m) => (
        <Link key={`m-${m.id}`} to={`/mutirao/${m.id}`} className="cr-card">
          <div className="cr-foto" style={{ background: 'linear-gradient(150deg,#2E9B6B,#1a6b48)' }}>
            {m.imagemUrl
              ? <img src={m.imagemUrl} alt="" loading="lazy" />
              : <IconUsers size={30} stroke={1.8} color="rgba(255,255,255,.92)" />}
            <span className="cr-chip" style={{ background: '#2E9B6B' }}>
              <IconUsers size={10} stroke={2.5} /> {m.quando}{m.horario ? ` ${m.horario}` : ''}
            </span>
          </div>
          <span className="cr-titulo">{m.titulo}</span>
          <span className="cr-sub">{m.municipio}/{m.uf}</span>
        </Link>
      ))}
      </div>
    </>
  )
}
