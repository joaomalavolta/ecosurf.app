import type { Alerta, Mutirao } from '../types/domain'

/**
 * Contador de impacto: denúncia não morre no print. Mostra quantas
 * ocorrências registradas pela comunidade viraram ação coletiva — a métrica
 * que fecha o ciclo cívico do app. Calculado dos dados já carregados na
 * página (zero consultas extras).
 */
function Num({ v, rotulo, cor }: { v: number; rotulo: string; cor?: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div className="dado" style={{ fontSize: 22, fontWeight: 700, color: cor ?? 'inherit' }}>{v}</div>
      <div className="muted" style={{ fontSize: 10.5, marginTop: 2, lineHeight: 1.25 }}>{rotulo}</div>
    </div>
  )
}

export function ImpactoComunidade({ alertas, mutiroes }: { alertas: Alerta[]; mutiroes: Mutirao[] }) {
  const viraramAcao = new Set(mutiroes.filter((m) => m.alertaId).map((m) => m.alertaId)).size
  if (alertas.length === 0 && mutiroes.length === 0) return null

  return (
    <div className="card pad" aria-label="Impacto da comunidade">
      <span className="eyebrow">🌱 Impacto da comunidade</span>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'flex-start' }}>
        <Num v={alertas.length} rotulo={'registros\nambientais'} />
        <Num v={mutiroes.length} rotulo={'mutirões\norganizados'} />
        <Num v={viraramAcao} rotulo={'ocorrências\nviraram ação'} cor="#2E9B6B" />
      </div>
    </div>
  )
}
