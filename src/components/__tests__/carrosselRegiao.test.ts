import { describe, it, expect } from 'vitest'
import { vagasDoCarrossel } from '../CarrosselRegiao'
import type { Alerta } from '../../types/domain'

/**
 * O carrossel "Agir local" tem oito vagas e dois critérios diferentes
 * disputando: alerta ordena por GRAVIDADE, registro positivo por NOVIDADE.
 *
 * A primeira versão jogou tudo numa fila só, dando aos positivos um peso pior
 * que o da gravidade mais baixa. Com dez alertas no ar — o caso real de hoje —
 * as oito vagas eram todas de alerta e nenhum positivo aparecia. O recurso
 * existia e era invisível.
 */

let n = 0
const reg = (over: Partial<Alerta>): Alerta => ({
  id: `r${++n}`,
  titulo: 'x',
  categoria: 'lixo-praia',
  status: 'identificado',
  gravidade: 'media',
  municipio: 'Itanhaém',
  uf: 'SP',
  ...over,
} as Alerta)

const alerta = (gravidade: Alerta['gravidade']) => reg({ gravidade })
const positivo = (criadaEm: string) =>
  reg({ categoria: 'fauna-avistada', gravidade: 'media', criadaEm })

describe('vagas do carrossel Agir local', () => {
  it('com dez alertas, o positivo AINDA aparece', () => {
    const dezAlertas = Array.from({ length: 10 }, () => alerta('alta'))
    const p = positivo('2026-08-17T00:00:00Z')

    const saida = vagasDoCarrossel([...dezAlertas, p])

    expect(saida).toHaveLength(8)
    expect(saida.map((r) => r.id)).toContain(p.id)
  })

  it('sem positivo nenhum, o alerta ocupa as oito vagas', () => {
    const saida = vagasDoCarrossel(Array.from({ length: 12 }, () => alerta('media')))
    expect(saida).toHaveLength(8)
  })

  it('reserva no máximo três vagas para positivos', () => {
    const saida = vagasDoCarrossel([
      ...Array.from({ length: 10 }, () => alerta('alta')),
      ...Array.from({ length: 6 }, (_, i) => positivo(`2026-08-1${i}T00:00:00Z`)),
    ])
    const nPositivos = saida.filter((r) => r.categoria === 'fauna-avistada').length
    expect(saida).toHaveLength(8)
    expect(nPositivos).toBe(3)
  })

  it('alerta mais grave vem antes, e os alertas abrem o trilho', () => {
    const baixa = alerta('baixa')
    const emergencial = alerta('emergencial')
    const p = positivo('2026-08-17T00:00:00Z')

    const saida = vagasDoCarrossel([baixa, p, emergencial])

    expect(saida[0].id).toBe(emergencial.id)
    expect(saida[1].id).toBe(baixa.id)
    expect(saida[2].id).toBe(p.id) // positivo depois dos alertas
  })

  it('positivo mais recente primeiro entre os positivos', () => {
    const velho = positivo('2026-01-01T00:00:00Z')
    const novo = positivo('2026-08-17T00:00:00Z')

    const saida = vagasDoCarrossel([velho, novo])

    expect(saida.map((r) => r.id)).toEqual([novo.id, velho.id])
  })

  it('só positivos: todos entram, sem alerta para abrir o trilho', () => {
    const saida = vagasDoCarrossel([positivo('2026-08-17T00:00:00Z'), positivo('2026-08-16T00:00:00Z')])
    expect(saida).toHaveLength(2)
  })
})
