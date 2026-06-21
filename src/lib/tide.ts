import type { PontoMare, FaseMare } from '../types/domain'

/**
 * MOCK de maré semidiurna (~12.42h), típica do litoral brasileiro.
 *
 * ⚠️ Substituir por harmônicas reais da DHN/Marinha (Centro de Hidrografia),
 * mapeando cada pico à sua estação de referência mais próxima. Maré é
 * hiperlocal — não dá para interpolar nacionalmente sem perder a peça-chave
 * do app (a maré sobreposta na timeline).
 */
export interface ParamsMare {
  media: number
  amplitude: number
  faseH: number // hora do dia em que ocorre a primeira preamar
}

const PADRAO: ParamsMare = { media: 0.7, amplitude: 0.6, faseH: 3.5 }
const PERIODO_H = 12.42

export function alturaMare(horaDoDia: number, p: ParamsMare = PADRAO): number {
  return p.media + p.amplitude * Math.sin((2 * Math.PI * (horaDoDia - p.faseH)) / PERIODO_H)
}

export function curvaMareDia(passoH = 0.25, p: ParamsMare = PADRAO): PontoMare[] {
  const pts: PontoMare[] = []
  for (let h = 0; h <= 24 + 1e-9; h += passoH) {
    pts.push({ hora: Number(h.toFixed(2)), alturaM: Number(alturaMare(h, p).toFixed(3)) })
  }
  return pts
}

export function faseMare(horaDoDia: number, p: ParamsMare = PADRAO): FaseMare {
  const antes = alturaMare(horaDoDia - 0.25, p)
  const agora = alturaMare(horaDoDia, p)
  const depois = alturaMare(horaDoDia + 0.25, p)
  if (agora >= antes && agora >= depois) return 'cheia'
  if (agora <= antes && agora <= depois) return 'seca'
  return depois > agora ? 'enchente' : 'vazante'
}

export function rotuloFase(f: FaseMare): string {
  return { enchente: 'maré enchendo', vazante: 'maré vazando', cheia: 'maré cheia', seca: 'maré seca' }[f]
}
