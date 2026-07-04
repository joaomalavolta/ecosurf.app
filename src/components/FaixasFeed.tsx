import { Link } from 'react-router-dom'
import type { Alerta, Mutirao } from '../types/domain'

/**
 * Faixas deslizáveis do feed (opção B): as fotos de onda seguem sendo o
 * fluxo principal do Radar; alertas e mutirões ganham palco em trilhos
 * horizontais compactos — visíveis sem roubar a cena. Mesma linguagem
 * visual dos stories: o app fica mais coeso, não mais poluído.
 */

const COR_GRAVIDADE: Record<string, string> = {
  critica: '#D64045', alta: '#E8734A', media: '#E8A05C', baixa: '#8FA6AD',
}

const ICONE_CATEGORIA: Record<string, string> = {
  'lixo-praia': '🗑', 'lixo-rio': '🍾', 'esgoto': '🟤', 'erosao': '⛰',
  'oleo': '🛢', 'animal': '🐢', 'entulho': '🧱', 'microplasticos': '⚬',
  'espuma': '🫧', 'queimada': '🔥', 'ocupacao': '🏗', 'outro': '⚠️',
}

export function FaixaAlertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) return null
  const ordenados = [...alertas].sort((a, b) => {
    const peso: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 }
    return (peso[a.gravidade ?? 'media'] ?? 2) - (peso[b.gravidade ?? 'media'] ?? 2)
  })
  return (
    <div style={{ padding: '2px 0 4px' }}>
      <span className="eyebrow" style={{ padding: '0 16px' }}>⚠️ Alertas na região</span>
      <div className="faixa-rolo">
        {ordenados.slice(0, 10).map((a) => (
          <Link key={a.id} to={`/alerta/${a.id}`} className="faixa-chip" style={{ borderColor: `${COR_GRAVIDADE[a.gravidade ?? 'media'] ?? '#8FA6AD'}66` }}>
            <span style={{ fontSize: 14 }}>{ICONE_CATEGORIA[a.categoria] ?? '⚠️'}</span>
            <span style={{ minWidth: 0 }}>
              <span className="faixa-chip-titulo">{a.titulo}</span>
              <span className="faixa-chip-sub">{a.municipio}{a.uf ? `/${a.uf}` : ''}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function FaixaMutiroes({ mutiroes }: { mutiroes: Mutirao[] }) {
  return (
    <div style={{ padding: '2px 0 4px' }}>
      <span className="eyebrow" style={{ padding: '0 16px' }}>🤝 Próximos mutirões</span>
      <div className="faixa-rolo">
        {mutiroes.slice(0, 10).map((m) => (
          <Link key={m.id} to={`/mutirao/${m.id}`} className="faixa-chip faixa-chip-verde">
            <span className="dado" style={{ fontSize: 11.5, fontWeight: 700, color: '#2E9B6B', whiteSpace: 'nowrap' }}>{m.quando}{m.horario ? ` ${m.horario}` : ''}</span>
            <span style={{ minWidth: 0 }}>
              <span className="faixa-chip-titulo">{m.titulo}</span>
              <span className="faixa-chip-sub">{m.municipio}/{m.uf}</span>
            </span>
          </Link>
        ))}
        <Link to="/nova-acao/mutirao" className="faixa-chip" style={{ color: 'var(--muted)' }}>
          ➕ criar
        </Link>
      </div>
    </div>
  )
}
