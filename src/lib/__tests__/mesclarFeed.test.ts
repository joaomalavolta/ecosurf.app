import { describe, it, expect } from 'vitest'
import { mesclarFeed, tilesMosaico } from '../mesclarFeed'
import type { Alerta, Mutirao, Pico, Foto } from '../../types/domain'

const pico = (id: string, municipio: string) => [id, { id, municipio } as Pico] as const
const foto = { picoId: 'x' } as Foto
const alerta = (id: string, p: Partial<Alerta>) =>
  ({ id, titulo: id, categoria: 'lixo-praia', gravidade: 'media', municipio: '', uf: 'SP', ...p } as Alerta)

const picoMap = new Map<string, Pico>([pico('pico-1', 'Santos'), pico('pico-2', 'Ubatuba')])
const feedCards: [string, Foto[]][] = [['pico-1', [foto]], ['pico-2', [foto]]]

describe('mesclarFeed', () => {
  it('ancora o alerta pelo picoId no card do pico', () => {
    const out = mesclarFeed(feedCards, [alerta('a1', { picoId: 'pico-1', municipio: 'Santos' })], [], picoMap)
    expect(out[0]).toMatchObject({ tipo: 'surf', picoId: 'pico-1' })
    expect(out[1]).toMatchObject({ tipo: 'eco', item: { id: 'a1' } })
  })

  it('ancora pela cidade quando não há picoId', () => {
    const out = mesclarFeed(feedCards, [alerta('a2', { municipio: 'ubatuba' })], [], picoMap)
    // deve cair logo após o card de pico-2 (Ubatuba), não o pico-1
    const idx = out.findIndex((u) => u.tipo === 'eco')
    expect(out[idx - 1]).toMatchObject({ tipo: 'surf', picoId: 'pico-2' })
  })

  it('inclui todos os itens, sem duplicar, e joga os "sem lugar" no fim', () => {
    const alertas = [
      alerta('a1', { picoId: 'pico-1', municipio: 'Santos' }),
      alerta('a2', { municipio: 'Ubatuba' }),
      alerta('a3', { municipio: 'Rio de Janeiro' }), // sem lugar no feed
    ]
    const out = mesclarFeed(feedCards, alertas, [], picoMap)
    const ecoIds = out.filter((u) => u.tipo === 'eco').map((u) => (u as { item: { id: string } }).item.id)
    expect(new Set(ecoIds).size).toBe(3)
    expect(ecoIds).toEqual(['a1', 'a2', 'a3'])
    expect(out[out.length - 1]).toMatchObject({ tipo: 'eco', item: { id: 'a3' } })
  })

  it('alerta recém-publicado aparece ANTES de antigos mais graves', () => {
    // O caso real: publiquei um alerta "media" e ele sumiu no fim do feed,
    // atrás de um emergencial e um alta bem mais velhos.
    const antigoGrave = alerta('velho-emergencial', {
      municipio: 'Santos', gravidade: 'emergencial', criadaEm: '2026-07-11T00:00:00Z',
    })
    const novo = alerta('recem-publicado', {
      municipio: 'Santos', gravidade: 'media', criadaEm: '2026-08-06T00:00:00Z',
    })
    const out = mesclarFeed(feedCards, [antigoGrave, novo], [], picoMap)
    const ecoIds = out.filter((u) => u.tipo === 'eco').map((u) => (u as { item: { id: string } }).item.id)
    expect(ecoIds[0]).toBe('recem-publicado')
    // e ele fica logo abaixo do card do pico da mesma cidade
    expect(out[0]).toMatchObject({ tipo: 'surf', picoId: 'pico-1' })
    expect(out[1]).toMatchObject({ tipo: 'eco', item: { id: 'recem-publicado' } })
  })

  it('gravidade continua desempatando quando a data é a mesma', () => {
    const em = '2026-08-06T00:00:00Z'
    const leve = alerta('leve', { municipio: 'Santos', gravidade: 'baixa', criadaEm: em })
    const grave = alerta('grave', { municipio: 'Santos', gravidade: 'emergencial', criadaEm: em })
    const out = mesclarFeed(feedCards, [leve, grave], [], picoMap)
    const ecoIds = out.filter((u) => u.tipo === 'eco').map((u) => (u as { item: { id: string } }).item.id)
    expect(ecoIds[0]).toBe('grave')
  })

  it('sem eco, devolve só os cards de pico', () => {
    const out = mesclarFeed(feedCards, [], [] as Mutirao[], picoMap)
    expect(out).toHaveLength(2)
    expect(out.every((u) => u.tipo === 'surf')).toBe(true)
  })
})

describe('tilesMosaico', () => {
  const ft = (id: string) => ({ id, picoId: 'p', capturadaEm: '2026-01-01' } as Foto)

  it('intercala eco entre as fotos e inclui todas', () => {
    const fotos = [ft('1'), ft('2'), ft('3'), ft('4'), ft('5'), ft('6')]
    const tiles = tilesMosaico(fotos, [alerta('a1', {}), alerta('a2', {})], [])
    expect(tiles.filter((t) => t.tipo === 'foto')).toHaveLength(6)
    expect(tiles.filter((t) => t.tipo === 'eco')).toHaveLength(2)
    // a primeira posição continua sendo uma foto (as fotos mantêm a ordem)
    expect(tiles[0]).toMatchObject({ tipo: 'foto' })
  })

  it('sem eco, devolve só tiles de foto', () => {
    const tiles = tilesMosaico([ft('1')], [], [] as Mutirao[])
    expect(tiles).toHaveLength(1)
    expect(tiles[0]).toMatchObject({ tipo: 'foto', foto: { id: '1' } })
  })
})
