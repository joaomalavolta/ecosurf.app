import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Foto, Pico } from '../types/domain'

/**
 * Story bubbles no topo do Radar — estilo Instagram.
 *
 * Organização: 1 bolha por combinação `autorNome + picoId` (foto mais recente).
 * Anel colorido:
 *   🟢 verde (recent) = foto nos últimos 30 minutos
 *   🔵 azul  (today)  = foto de hoje (mais de 30 min atrás)
 */

interface StoryItem {
  key: string
  foto: Foto
  picoNome: string
}

function recencyClass(capturadaEm: string): 'recent' | 'today' {
  const diff = Date.now() - new Date(capturadaEm).getTime()
  return diff <= 30 * 60 * 1000 ? 'recent' : 'today'
}

export function StoryBubbles({ fotos, picos }: { fotos: Foto[]; picos: Pico[] }) {
  const picoMap = useMemo(() => {
    const m = new Map<string, Pico>()
    for (const p of picos) m.set(p.id, p)
    return m
  }, [picos])

  const stories = useMemo<StoryItem[]>(() => {
    // Agrupa por autorNome+picoId, pega a foto mais recente de cada combo
    const groups = new Map<string, Foto>()
    // Fotos já vêm ordenadas por capturadaEm desc do backend
    for (const f of fotos) {
      const key = `${f.autorNome}::${f.picoId}`
      if (!groups.has(key)) {
        groups.set(key, f)
      }
    }
    return Array.from(groups.entries())
      .map(([key, foto]) => ({
        key,
        foto,
        picoNome: picoMap.get(foto.picoId)?.nome ?? foto.picoId,
      }))
      .sort((a, b) => new Date(b.foto.capturadaEm).getTime() - new Date(a.foto.capturadaEm).getTime())
  }, [fotos, picoMap])

  if (stories.length === 0) return null

  return (
    <div className="story-track" role="list" aria-label="Fotos recentes da comunidade">
      {stories.map((s) => (
        <Link
          key={s.key}
          to={`/pico/${s.foto.picoId}?foto=${s.foto.id}`}
          className="story-bubble"
          role="listitem"
        >
          <div className={`story-ring ${recencyClass(s.foto.capturadaEm)}`}>
            <img
              src={s.foto.url}
              alt={`Foto de ${s.picoNome} por ${s.foto.autorNome}`}
              loading="lazy"
            />
          </div>
          <div className="story-pico">{s.picoNome}</div>
          <div className="story-autor">{s.foto.autorNome.split(' ')[0]}</div>
        </Link>
      ))}
    </div>
  )
}
