import { describe, it, expect } from 'vitest'
import { alturaMareAstro, curvaDiaAstro } from '../tide-astro'
import { ESTACOES_BNDO, estacaoBndoMaisProxima } from '../../services/tide/estacoes-bndo'
import { TABUA_SANTOS_2026 } from '../../services/tide/tabuas/santos-2026'

const SANTOS = ESTACOES_BNDO.find((e) => e.id === 'santos')!
const TZ_MS = 3 * 3600000 // litoral brasileiro inteiro é UTC−3

/** Extremos (preamares/baixa-mares) do modelo num dia, em minutos locais. */
function extremosModelo(ano: number, mes: number, dia: number, est = SANTOS): [number, number][] {
  const meiaNoiteUTC = Date.UTC(ano, mes - 1, dia) + TZ_MS
  const alturas: [number, number][] = []
  for (let m = -60; m <= 24 * 60 + 60; m += 6)
    alturas.push([m, alturaMareAstro(meiaNoiteUTC + m * 60000, est.constantes, est.nivelMedioM)])
  const ex: [number, number][] = []
  for (let i = 1; i < alturas.length - 1; i++) {
    const [m, a] = alturas[i]
    if (m < 0 || m >= 1440) continue
    if (
      (a >= alturas[i - 1][1] && a >= alturas[i + 1][1]) ||
      (a <= alturas[i - 1][1] && a <= alturas[i + 1][1])
    )
      ex.push([m, a])
  }
  return ex
}

describe('motor astronômico × tábua oficial DHN (Santos 2026)', () => {
  // Dias espalhados pelo ano — sizígias, quadraturas e transições.
  const dias = ['01-15', '02-05', '03-14', '04-22', '05-20', '06-08', '07-13', '08-30', '09-17', '10-07', '11-11', '12-25']

  it('horários e alturas dos extremos batem com a Marinha (tolerâncias de fallback)', () => {
    const difsT: number[] = []
    const difsH: number[] = []
    for (const chave of dias) {
      const [mes, dia] = chave.split('-').map(Number)
      const oficial = TABUA_SANTOS_2026[chave]
      const modelo = extremosModelo(2026, mes, dia)
      for (const [mOf, hOf] of oficial) {
        let melhor: { d: number; dh: number } | null = null
        for (const [mMo, hMo] of modelo) {
          const d = Math.abs(mMo - mOf)
          if (!melhor || d < melhor.d) melhor = { d, dh: Math.abs(hMo - hOf) }
        }
        if (melhor && melhor.d < 180) {
          difsT.push(melhor.d)
          difsH.push(melhor.dh)
        }
      }
    }
    const med = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
    // Constantes de série histórica (1956) vs tábua atual: aceita-se erro de
    // fallback. O que este teste blinda é a CONVENÇÃO (fuso/época): um erro de
    // convenção produz Δt ≥ 2,5 h — ordens de grandeza acima do limite.
    expect(difsT.length).toBeGreaterThan(30)
    expect(med(difsT)).toBeLessThan(45) // minutos
    expect(med(difsH)).toBeLessThan(0.2) // metros
  })

  it('a curva muda de um dia para o outro (maré atrasa ~50 min/dia)', () => {
    const hoje = extremosModelo(2026, 7, 13)
    const amanha = extremosModelo(2026, 7, 14)
    const primeiraPreamarHoje = hoje.find(([, a]) => a > SANTOS.nivelMedioM)
    const primeiraPreamarAmanha = amanha.find(([, a]) => a > SANTOS.nivelMedioM)
    expect(primeiraPreamarHoje).toBeDefined()
    expect(primeiraPreamarAmanha).toBeDefined()
    expect(primeiraPreamarHoje![0]).not.toBe(primeiraPreamarAmanha![0])
  })
})

describe('dataset nacional BNDO', () => {
  it('tem as 26 estações e todo o gradiente de amplitude da costa', () => {
    expect(ESTACOES_BNDO.length).toBe(26)
    const amp = (id: string) => {
      const e = ESTACOES_BNDO.find((x) => x.id === id)!
      return (e.constantes.M2?.amp ?? 0) + (e.constantes.S2?.amp ?? 0)
    }
    // Norte macromaré ≫ Sudeste mesomaré ≫ Sul micromaré
    expect(amp('ponta-madeira')).toBeGreaterThan(2.0)
    expect(amp('santos')).toBeGreaterThan(0.5)
    expect(amp('santos')).toBeLessThan(0.8)
    expect(amp('rio-grande')).toBeLessThan(0.15)
  })

  it('todas as estações têm as 5 componentes essenciais (ou justificadas)', () => {
    for (const e of ESTACOES_BNDO) {
      expect(e.constantes.M2, `${e.id} sem M2`).toBeDefined()
      expect(e.constantes.S2, `${e.id} sem S2`).toBeDefined()
      expect(e.constantes.N2, `${e.id} sem N2`).toBeDefined()
      expect(e.constantes.O1, `${e.id} sem O1`).toBeDefined()
      expect(e.constantes.K1, `${e.id} sem K1`).toBeDefined()
      expect(e.nivelMedioM).toBeGreaterThan(0)
    }
  })

  it('picos de Itanhaém caem em Santos; de Fortaleza, em Fortaleza', () => {
    expect(estacaoBndoMaisProxima(-24.19, -46.8).id).toBe('santos')
    expect(estacaoBndoMaisProxima(-3.72, -38.5).id).toBe('fortaleza')
  })

  it('curvaDiaAstro devolve 97 pontos plausíveis para qualquer estação', () => {
    for (const e of ESTACOES_BNDO) {
      const curva = curvaDiaAstro(new Date(2026, 6, 13), e.constantes, e.nivelMedioM)
      expect(curva.length).toBe(97)
      for (const p of curva) {
        expect(p.alturaM).toBeGreaterThan(-1)
        expect(p.alturaM).toBeLessThan(8)
      }
    }
  })
})
