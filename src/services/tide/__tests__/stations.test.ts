import { describe, it, expect } from 'vitest'
import { ESTACOES, estacaoMaisProxima, daFicha, PERIODOS_H } from '../stations'
import { constituintesDoPico } from '../provider'
import { CONSTITUINTES_PADRAO } from '../../../lib/tide'
import type { Pico } from '../../../types/domain'

// helper: pico mínimo só com o que a maré precisa (lat/lng)
function picoEm(lat: number, lng: number): Pico {
  return {
    id: 't', nome: 't', praia: 't', municipio: 't', uf: 'SP',
    regiaoSurfId: 'r', lat, lng, orientacaoPraiaDeg: 135, fundo: 'areia',
  }
}

describe('estacaoMaisProxima', () => {
  it('liga Itanhaém/Mongaguá à estação de Santos', () => {
    expect(estacaoMaisProxima(-24.17, -46.78).id).toBe('santos') // Itanhaém
    expect(estacaoMaisProxima(-24.09, -46.62).id).toBe('santos') // Mongaguá
  })

  it('liga o litoral sul à estação de Cananéia', () => {
    expect(estacaoMaisProxima(-25.01, -47.92).id).toBe('cananeia') // Cananéia
    expect(estacaoMaisProxima(-24.73, -47.55).id).toBe('cananeia') // Ilha Comprida
  })

  it('liga o litoral norte à estação oficial mais próxima (CHM São Sebastião)', () => {
    // Caraguatatuba fica mais perto do Porto de São Sebastião (CHM nº 45),
    // estação oficial da publicação 2026, que do placeholder de Ubatuba.
    expect(estacaoMaisProxima(-23.62, -45.41).id).toBe('porto-de-sao-sebastiao')
  })

  it('leva picos de outros estados à estação CHM da região (escala nacional)', () => {
    expect(estacaoMaisProxima(-8.11, -34.89).id).toContain('recife') // Recife/PE
  })
})

describe('daFicha (conversão FEMAR → Constituinte)', () => {
  it('converte amplitude de cm para metros e mantém a fase em graus', () => {
    const c = daFicha('M2', 42, 95)
    expect(c.nome).toBe('M2')
    expect(c.amp).toBeCloseTo(0.42, 10)
    expect(c.faseDeg).toBe(95)
    expect(c.periodoH).toBe(PERIODOS_H.M2)
  })
})

describe('constituintesDoPico', () => {
  it('cai nas constantes genéricas enquanto a estação não tem ficha', () => {
    // Estado atual: nenhuma estação preenchida ainda.
    expect(constituintesDoPico(picoEm(-24.17, -46.78))).toBe(CONSTITUINTES_PADRAO)
  })
})

describe('fichas das estações (sanidade dos dados oficiais quando preenchidos)', () => {
  it('toda constituinte preenchida tem período conhecido e amplitude física', () => {
    for (const est of ESTACOES) {
      for (const c of est.constituintes) {
        expect(Object.values(PERIODOS_H)).toContain(c.periodoH)
        expect(c.amp).toBeGreaterThan(0)
        expect(c.amp).toBeLessThan(5) // 5 m de amplitude de UMA componente = erro de digitação
        expect(c.faseDeg).toBeGreaterThanOrEqual(0)
        expect(c.faseDeg).toBeLessThanOrEqual(360)
      }
    }
  })
})
