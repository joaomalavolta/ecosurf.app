import { Link } from 'react-router-dom'
import { IconSeeding, IconAlertTriangle, IconUsers, IconPaw } from '@tabler/icons-react'
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

  // Alerta ordena por gravidade; registro positivo não tem gravidade e por
  // isso entra depois, na ordem em que veio (mais recente primeiro).
  const registrosOrd = [...alertas]
    .sort((a, b) => {
      const pa = categoriaPorId(a.categoria).tipo === 'positivo' ? 9 : (PESO_GRAV[a.gravidade ?? 'media'] ?? 2)
      const pb = categoriaPorId(b.categoria).tipo === 'positivo' ? 9 : (PESO_GRAV[b.gravidade ?? 'media'] ?? 2)
      return pa - pb
    })
    .slice(0, 8)

  return (
    <>
      <div className="between" style={{ padding: '6px 16px 0' }}>
        <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconSeeding size={12} stroke={2} /> Agir local · o que há por perto</span>
      </div>
      <div className="carrossel-regiao">
      {registrosOrd.map((a) => {
        const cat = categoriaPorId(a.categoria)
        const IconeCat = cat.icone
        const img = a.images?.[0]
        // Positivo usa a cor da categoria; a escala de gravidade pintaria de
        // laranja "média" uma tartaruga avistada.
        const ehPositivo = cat.tipo === 'positivo'
        const cor = ehPositivo ? cat.cor : (COR_GRAVIDADE[a.gravidade ?? 'media'] ?? '#8FA6AD')
        return (
          <Link key={`a-${a.id}`} to={`/alerta/${a.id}`} className="cr-card">
            <div className="cr-foto" style={{ background: 'linear-gradient(135deg, #0D6EA8, #2E9BD6)' }}>
              {img
                ? <img src={`${SUPABASE_URL}/storage/v1/object/public/fotos/${img}`} alt="" loading="lazy" />
                : <IconeCat size={30} stroke={1.8} color="rgba(255,255,255,.92)" />}
              <span className="cr-chip" style={{ background: cor }}>
                {ehPositivo
                  ? <><IconPaw size={10} stroke={2.5} /> {cat.label}</>
                  : <><IconAlertTriangle size={10} stroke={2.5} /> {a.gravidade ?? 'média'}</>}
              </span>
            </div>
            <span className="cr-titulo">{a.titulo}</span>
            <span className="cr-sub">{a.municipio}{a.uf ? `/${a.uf}` : ''}</span>
          </Link>
        )
      })}

      {mutiroes.slice(0, 8).map((m) => (
        <Link key={`m-${m.id}`} to={`/mutirao/${m.id}`} className="cr-card">
          <div className="cr-foto" style={{ background: 'linear-gradient(135deg, #0D6EA8, #2E9BD6)' }}>
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
