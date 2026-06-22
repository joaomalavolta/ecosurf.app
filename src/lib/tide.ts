import type { PontoMare, FaseMare } from '../types/domain'

/**
 * Modelo de maré por SOMA DE CONSTITUINTES HARMÔNICAS — gera uma curva mista
 * (semidiurna com desigualdade diurna), bem mais realista que uma senoide só.
 *
 * As amplitudes/fases aqui são genéricas (litoral SE/S do Brasil). A maré real
 * é por estação: cada constituinte tem amplitude e fase PRÓPRIAS na tábua da
 * DHN. O `dhnTideProvider` deve injetar essas constantes por pico — ver
 * services/tide/provider.ts.
 */
export interface Constituinte {
  nome: string
  periodoH: number
  amp: number
  faseDeg: number
}

export const CONSTITUINTES_PADRAO: Constituinte[] = [
  { nome: 'M2', periodoH: 12.4206, amp: 0.45, faseDeg: 60 },
  { nome: 'S2', periodoH: 12.0, amp: 0.16, faseDeg: 95 },
  { nome: 'N2', periodoH: 12.6583, amp: 0.1, faseDeg: 40 },
  { nome: 'O1', periodoH: 25.8193, amp: 0.09, faseDeg: 300 },
  { nome: 'K1', periodoH: 23.9345, amp: 0.06, faseDeg: 320 },
]

const NIVEL_MEDIO = 0.7

export function alturaMare(horaDoDia: number, cs: Constituinte[] = CONSTITUINTES_PADRAO): number {
  let h = NIVEL_MEDIO
  for (const c of cs) {
    h += c.amp * Math.cos((2 * Math.PI * horaDoDia) / c.periodoH - (c.faseDeg * Math.PI) / 180)
  }
  return h
}

export function curvaMareDia(passoH = 0.25, cs: Constituinte[] = CONSTITUINTES_PADRAO): PontoMare[] {
  const pts: PontoMare[] = []
  for (let h = 0; h <= 24 + 1e-9; h += passoH) {
    pts.push({ hora: Number(h.toFixed(2)), alturaM: Number(alturaMare(h, cs).toFixed(3)) })
  }
  return pts
}

export function faseMare(horaDoDia: number, cs: Constituinte[] = CONSTITUINTES_PADRAO): FaseMare {
  const antes = alturaMare(horaDoDia - 0.25, cs)
  const agora = alturaMare(horaDoDia, cs)
  const depois = alturaMare(horaDoDia + 0.25, cs)
  if (agora >= antes && agora >= depois) return 'cheia'
  if (agora <= antes && agora <= depois) return 'seca'
  return depois > agora ? 'enchente' : 'vazante'
}

export function rotuloFase(f: FaseMare): string {
  return { enchente: 'maré enchendo', vazante: 'maré vazando', cheia: 'maré cheia', seca: 'maré seca' }[f]
}
