import type { PontoMare } from '../../types/domain'
import { TABUA_SANTOS_2026, type ExtremoMare } from './tabuas/santos-2026'

/**
 * Leitor de TÁBUA OFICIAL da DHN. Em vez de estimar a maré por modelo, usa os
 * horários e alturas de preamar/baixa-mar publicados pela Marinha e interpola
 * entre eles pela curva clássica de meia-onda (cosseno) — o padrão náutico,
 * mais fiel que uma reta.
 *
 * Só cobre os dias/estações com tábua transcrita. Fora disso, o provider cai
 * no modelo harmônico genérico (fallback), sem quebrar.
 */

export interface TabuaEstacao {
  nivelMedio: number
  /** Ano que a tábua cobre. Fora dele, não se aplica (evita usar 2026 em 2027). */
  ano: number
  dias: Record<string, ExtremoMare[]>
}

export const TABUAS: Record<string, TabuaEstacao> = {
  santos: { nivelMedio: 0.78, ano: 2026, dias: TABUA_SANTOS_2026 },
}

function chaveDia(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

/** Extremos do dia + os vizinhos (véspera/dia seguinte) para interpolar bordas. */
function extremosContexto(tabua: TabuaEstacao, data: Date): ExtremoMare[] {
  const ontem = new Date(data)
  ontem.setDate(ontem.getDate() - 1)
  const amanha = new Date(data)
  amanha.setDate(amanha.getDate() + 1)

  const pega = (d: Date, offsetMin: number): ExtremoMare[] =>
    (tabua.dias[chaveDia(d)] ?? []).map(([m, a]) => [m + offsetMin, a] as ExtremoMare)

  return [...pega(ontem, -1440), ...pega(data, 0), ...pega(amanha, 1440)]
}

/** Altura interpolada (meia-onda cosseno) num instante, em minutos do dia. */
export function alturaTabua(tabua: TabuaEstacao, data: Date, minutosDoDia: number): number | null {
  const ex = extremosContexto(tabua, data)
  if (ex.length < 2) return null

  // Acha o par de extremos que cerca o instante.
  let ant: ExtremoMare | null = null
  let prox: ExtremoMare | null = null
  for (let i = 0; i < ex.length - 1; i++) {
    if (ex[i][0] <= minutosDoDia && minutosDoDia <= ex[i + 1][0]) {
      ant = ex[i]
      prox = ex[i + 1]
      break
    }
  }
  if (!ant || !prox) return null

  const [t1, h1] = ant
  const [t2, h2] = prox
  if (t2 === t1) return h1
  // Meia-onda: h = média + (amplitude/2)·cos(π·fração). Suave nos extremos.
  const frac = (minutosDoDia - t1) / (t2 - t1)
  const media = (h1 + h2) / 2
  const amp = (h1 - h2) / 2
  return media + amp * Math.cos(Math.PI * frac)
}

/** Curva do dia (padrão: passo de 15 min) a partir da tábua oficial. */
export function curvaTabua(tabua: TabuaEstacao, data: Date, passoMin = 15): PontoMare[] | null {
  const pts: PontoMare[] = []
  for (let m = 0; m <= 1440; m += passoMin) {
    const h = alturaTabua(tabua, data, m)
    if (h === null) return null
    pts.push({ hora: Number((m / 60).toFixed(2)), alturaM: Number(h.toFixed(3)) })
  }
  return pts
}

/** Há tábua oficial para esta estação e este dia (mesmo ano)? */
export function temTabua(estacaoId: string, data: Date): boolean {
  const t = TABUAS[estacaoId]
  return !!t && data.getFullYear() === t.ano && !!t.dias[chaveDia(data)]
}
