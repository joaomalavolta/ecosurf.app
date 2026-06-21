import type { Forecast } from '../types/domain'
import { rotuloVento, pontoCardeal } from '../lib/surf'
import { rotuloFase } from '../lib/tide'

function Mini({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--cinza)', borderRadius: 14, padding: '10px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{k}</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{v}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{sub}</div>}
    </div>
  )
}

/** Oceanografia que serve à leitura de surf: onda+período, terral×maral, maré. */
export function ForecastStrip({ f }: { f: Forecast }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 12 }}>
      <Mini k="Onda" v={`${f.ondaM.toFixed(1)}m`} sub={pontoCardeal(f.direcaoOndaDeg)} />
      <Mini k="Período" v={`${Math.round(f.periodoS)}s`} />
      <Mini k="Vento" v={rotuloVento(f.vento.tipo)} sub={`${pontoCardeal(f.vento.direcaoDeg)} ${Math.round(f.vento.velocidadeKmh)}km/h`} />
      <Mini k="Maré" v={`${f.mare.alturaM.toFixed(1)}m`} sub={rotuloFase(f.mare.fase).replace('maré ', '')} />
    </div>
  )
}
