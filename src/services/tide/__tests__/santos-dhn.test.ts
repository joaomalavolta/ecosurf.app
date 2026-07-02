import { describe, it, expect } from 'vitest'
import { ESTACOES, estacaoMaisProxima } from '../stations'
import { constituintesDoPico, nivelMedioDoPico } from '../provider'
import { CONSTITUINTES_PADRAO } from '../../../lib/tide'
import type { Pico } from '../../../types/domain'

/**
 * RÉGUA DE OURO — Tábua de Marés DHN, Porto de Santos 2026 (Carta 1711).
 *
 * Amostra de preamares (PM) e baixa-mares (BM) reais, extraídas do documento
 * oficial. Servem para MEDIR o acerto do modelo harmônico em metros assim que
 * as 24 constantes da ficha FEMAR forem preenchidas.
 *
 * Enquanto as constantes não estão plugadas, o teste de precisão fica em
 * `.skip` (documentado, não falhando). O que roda hoje valida os fatos já
 * oficiais: nível médio de Santos e o vínculo geográfico.
 */

// [data-hora ISO local, altura em m] — pontos extremos reais da tábua DHN 2026
const AMOSTRA_SANTOS_2026: Array<[string, number]> = [
  ['2026-01-01T02:04', 1.41], // PM
  ['2026-01-01T08:19', 0.37], // BM
  ['2026-01-01T13:47', 1.09], // PM
  ['2026-01-01T19:34', 0.15], // BM
  ['2026-03-31T02:34', 1.38], // PM
  ['2026-03-31T07:55', 0.29], // BM
  ['2026-07-30T09:42', -0.04], // BM (maré negativa — bom estresse do modelo)
  ['2026-09-25T08:14', -0.07], // BM
  ['2026-12-24T03:40', 1.49], // PM (máxima do ano na amostra)
]

const NIVEL_MEDIO_SANTOS = 0.78 // cabeçalho oficial da tábua DHN 2026

function picoEm(lat: number, lng: number): Pico {
  return {
    id: 't', nome: 't', praia: 't', municipio: 't', uf: 'SP',
    regiaoSurfId: 'r', lat, lng, orientacaoPraiaDeg: 135, fundo: 'areia',
  }
}
const picoSantos = picoEm(-23.96, -46.31)

describe('Santos: nível médio oficial da DHN', () => {
  it('a estação de Santos usa 0,78 m (não o genérico 0,70)', () => {
    const santos = ESTACOES.find((e) => e.id === 'santos')!
    expect(santos.nivelMedioM).toBe(NIVEL_MEDIO_SANTOS)
    expect(nivelMedioDoPico(picoSantos)).toBe(NIVEL_MEDIO_SANTOS)
  })

  it('a amostra da tábua oscila em torno do nível médio oficial', () => {
    const alturas = AMOSTRA_SANTOS_2026.map(([, h]) => h)
    const media = alturas.reduce((a, b) => a + b, 0) / alturas.length
    // média de PMs e BMs deve orbitar o nível médio (folga p/ amostra pequena)
    expect(media).toBeGreaterThan(0.3)
    expect(media).toBeLessThan(1.2)
  })
})

describe('Santos: vínculo geográfico', () => {
  it('picos da Baixada Santista caem na estação de Santos', () => {
    expect(estacaoMaisProxima(-23.96, -46.31).id).toBe('santos')
  })
})

// ── Precisão do modelo: liga quando as 24 constantes da FEMAR entrarem ──
describe.skip('Santos: precisão do modelo contra a tábua DHN (requer ficha FEMAR)', () => {
  it('erro < 0,20 m nos pontos extremos reais de 2026', async () => {
    // pré-condição: constantes plugadas (deixa de ser as genéricas)
    expect(constituintesDoPico(picoSantos)).not.toBe(CONSTITUINTES_PADRAO)

    const { alturaMare } = await import('../../../lib/tide')
    const cs = constituintesDoPico(picoSantos)
    const nm = nivelMedioDoPico(picoSantos)
    for (const [iso, esperado] of AMOSTRA_SANTOS_2026) {
      const d = new Date(iso)
      const calc = alturaMare(d.getHours() + d.getMinutes() / 60, cs, nm)
      expect(Math.abs(calc - esperado)).toBeLessThan(0.2)
    }
  })
})
