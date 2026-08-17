import { IconSeeding } from '@tabler/icons-react'
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

export function ImpactoComunidade({
  alertas,
  positivos = [],
  mutiroes,
}: {
  alertas: Alerta[]
  /** Registros positivos — contados à parte para não inflar "alertas". */
  positivos?: Alerta[]
  mutiroes: Mutirao[]
}) {
  const viraramAcao = new Set(mutiroes.filter((m) => m.alertaId).map((m) => m.alertaId)).size
  if (alertas.length === 0 && positivos.length === 0 && mutiroes.length === 0) return null

  return (
    <div className="card pad" aria-label="Impacto da comunidade">
      <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><IconSeeding size={12} stroke={2} /> Impacto da comunidade</span>
      {/* Quatro números não cabem lado a lado em 360 px sem quebrar o rótulo
          de duas linhas em quatro. A grade 2×2 acomoda; acima de 400 px volta
          para a linha única de sempre. */}
      <div className="impacto-nums" style={{ marginTop: 10 }}>
        <Num v={alertas.length} rotulo={'alertas\nambientais'} />
        <Num v={positivos.length} rotulo={'registros\npositivos'} cor="#2E9B6B" />
        <Num v={mutiroes.length} rotulo={'mutirões\norganizados'} />
        <Num v={viraramAcao} rotulo={'alertas\nviraram ação'} cor="#2E9B6B" />
      </div>
    </div>
  )
}
