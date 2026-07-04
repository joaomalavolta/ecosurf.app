import { Link } from 'react-router-dom'
import type { Alerta, Mutirao } from '../types/domain'
import { SUPABASE_URL } from '../services/supabase/config'

/**
 * Mini-carrossel da região: alertas e mutirões com FOTO, num trilho único
 * logo abaixo dos filtros do feed. Substitui as faixas soltas — os reports
 * cívicos ganham palco visual sem competir com as fotos-herói de onda.
 */

const COR_GRAVIDADE: Record<string, string> = {
  critica: '#D64045', alta: '#E8734A', media: '#E8A05C', baixa: '#8FA6AD',
}

const VISUAL_CATEGORIA: Record<string, { emoji: string; grad: string }> = {
  'lixo-praia': { emoji: '🗑', grad: 'linear-gradient(150deg,#8a6d4a,#5e4a34)' },
  'lixo-rio': { emoji: '🍾', grad: 'linear-gradient(150deg,#5e7a5a,#3c5240)' },
  'esgoto': { emoji: '🟤', grad: 'linear-gradient(150deg,#6e5a48,#463a2e)' },
  'erosao': { emoji: '⛰', grad: 'linear-gradient(150deg,#8a7a62,#5c5142)' },
  'oleo': { emoji: '🛢', grad: 'linear-gradient(150deg,#3c4248,#22262a)' },
  'animal': { emoji: '🐢', grad: 'linear-gradient(150deg,#4a7a72,#2e504a)' },
  'entulho': { emoji: '🧱', grad: 'linear-gradient(150deg,#8a5e4a,#5c3e30)' },
  'microplasticos': { emoji: '⚬', grad: 'linear-gradient(150deg,#7a8a92,#4e5a60)' },
  'espuma': { emoji: '🫧', grad: 'linear-gradient(150deg,#7a92a2,#4e6270)' },
  'queimada': { emoji: '🔥', grad: 'linear-gradient(150deg,#a25e3c,#6e3a22)' },
  'ocupacao': { emoji: '🏗', grad: 'linear-gradient(150deg,#8a8262,#5c5642)' },
  'outro': { emoji: '⚠️', grad: 'linear-gradient(150deg,#6e7a82,#464e54)' },
}

const PESO_GRAV: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 }

export function CarrosselRegiao({ alertas, mutiroes }: { alertas: Alerta[]; mutiroes: Mutirao[] }) {
  if (alertas.length === 0 && mutiroes.length === 0) return null

  const alertasOrd = [...alertas]
    .sort((a, b) => (PESO_GRAV[a.gravidade ?? 'media'] ?? 2) - (PESO_GRAV[b.gravidade ?? 'media'] ?? 2))
    .slice(0, 8)

  return (
    <div className="carrossel-regiao">
      {alertasOrd.map((a) => {
        const visual = VISUAL_CATEGORIA[a.categoria] ?? VISUAL_CATEGORIA.outro
        const img = a.images?.[0]
        const cor = COR_GRAVIDADE[a.gravidade ?? 'media'] ?? '#8FA6AD'
        return (
          <Link key={`a-${a.id}`} to={`/alerta/${a.id}`} className="cr-card">
            <div className="cr-foto" style={{ background: visual.grad }}>
              {img
                ? <img src={`${SUPABASE_URL}/storage/v1/object/public/fotos/${img}`} alt="" loading="lazy" />
                : <span className="cr-emoji">{visual.emoji}</span>}
              <span className="cr-chip" style={{ background: cor }}>⚠️ {a.gravidade ?? 'média'}</span>
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
              : <span className="cr-emoji">🤝</span>}
            <span className="cr-chip" style={{ background: '#2E9B6B' }}>🤝 {m.quando}{m.horario ? ` ${m.horario}` : ''}</span>
          </div>
          <span className="cr-titulo">{m.titulo}</span>
          <span className="cr-sub">{m.municipio}/{m.uf}</span>
        </Link>
      ))}
    </div>
  )
}
