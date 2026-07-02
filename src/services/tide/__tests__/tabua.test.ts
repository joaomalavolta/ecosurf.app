import { describe, it, expect } from 'vitest'
import { TABUAS, curvaTabua, alturaTabua, temTabua } from '../tabua'
import { TABUA_SANTOS_2026 } from '../tabuas/santos-2026'
import { dhnTideProvider } from '../provider'
import type { Pico } from '../../../types/domain'

const santos = TABUAS.santos

// pico em Itanhaém (cai na estação de Santos)
function picoItanhaem(): Pico {
  return {
    id: 'itanhaem', nome: 'Itanhaém', praia: 'Cibratel', municipio: 'Itanhaém',
    uf: 'SP', regiaoSurfId: 'litoral-sul-sp', lat: -24.17, lng: -46.78,
    orientacaoPraiaDeg: 135, fundo: 'areia',
  }
}

describe('tábua Santos 2026 — integridade dos dados', () => {
  it('cobre os 365 dias do ano', () => {
    expect(Object.keys(TABUA_SANTOS_2026)).toHaveLength(365)
  })

  it('todo extremo tem hora válida (0..1439) e altura física', () => {
    for (const pts of Object.values(TABUA_SANTOS_2026)) {
      for (const [m, a] of pts) {
        expect(m).toBeGreaterThanOrEqual(0)
        expect(m).toBeLessThan(1440)
        expect(a).toBeGreaterThan(-0.5)
        expect(a).toBeLessThan(2.0)
      }
    }
  })

  it('extremos de cada dia estão em ordem cronológica', () => {
    for (const pts of Object.values(TABUA_SANTOS_2026)) {
      const horas = pts.map((p) => p[0])
      expect(horas).toEqual([...horas].sort((a, b) => a - b))
    }
  })

  it('nível médio oficial é 0.78 m', () => {
    expect(santos.nivelMedio).toBe(0.78)
  })
})

describe('alturaTabua — interpolação passa pelos extremos oficiais', () => {
  it('reproduz exatamente a altura nos horários de preamar/baixa-mar', () => {
    // 01/01/2026: 02:04→1.41, 08:19→0.37, 13:47→1.09, 19:34→0.15
    const dia = new Date(2026, 0, 1)
    expect(alturaTabua(santos, dia, 2 * 60 + 4)).toBeCloseTo(1.41, 2)
    expect(alturaTabua(santos, dia, 8 * 60 + 19)).toBeCloseTo(0.37, 2)
    expect(alturaTabua(santos, dia, 13 * 60 + 47)).toBeCloseTo(1.09, 2)
    expect(alturaTabua(santos, dia, 19 * 60 + 34)).toBeCloseTo(0.15, 2)
  })

  it('entre preamar e baixa-mar, a altura fica entre os dois valores', () => {
    const dia = new Date(2026, 0, 1)
    const meio = alturaTabua(santos, dia, (2 * 60 + 4 + 8 * 60 + 19) / 2)!
    expect(meio).toBeLessThan(1.41)
    expect(meio).toBeGreaterThan(0.37)
  })

  it('interpola a madrugada usando o último extremo da véspera', () => {
    // 00:30 de 02/01 fica entre 19:34 (01/01, 0.15) e 02:51 (02/01, 1.46)
    const h = alturaTabua(santos, new Date(2026, 0, 2), 30)
    expect(h).not.toBeNull()
    expect(h!).toBeGreaterThan(0.15)
    expect(h!).toBeLessThan(1.46)
  })
})

describe('curvaTabua', () => {
  it('gera 97 pontos (0h–24h, passo 15 min) sem furos', () => {
    const c = curvaTabua(santos, new Date(2026, 5, 15))
    expect(c).not.toBeNull()
    expect(c!).toHaveLength(97)
    for (const p of c!) expect(Number.isFinite(p.alturaM)).toBe(true)
  })
})

describe('temTabua', () => {
  it('reconhece dias de 2026 em Santos e recusa fora do escopo', () => {
    expect(temTabua('santos', new Date(2026, 0, 1))).toBe(true)
    expect(temTabua('santos', new Date(2027, 0, 1))).toBe(false) // ano sem tábua
    expect(temTabua('cananeia', new Date(2026, 0, 1))).toBe(false) // sem tábua ainda
  })
})

describe('provider usa a tábua oficial para picos ligados a Santos', () => {
  it('a curva de Itanhaém em 2026 vem da tábua (bate nos extremos)', async () => {
    const dia = new Date(2026, 0, 1, 2, 4) // 02:04, preamar 1.41
    const h = await dhnTideProvider.alturaEm(picoItanhaem(), dia.toISOString())
    expect(h).toBeCloseTo(1.41, 1)
  })

  it('fora de 2026 cai no modelo genérico sem quebrar', async () => {
    const c = await dhnTideProvider.curvaDoDia(picoItanhaem(), new Date(2027, 0, 1))
    expect(c.length).toBeGreaterThan(0) // modelo harmônico assume
  })
})
