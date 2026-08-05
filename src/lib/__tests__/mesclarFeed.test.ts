import { describe, it, expect } from 'vitest'
import { mesclarFeed } from '../mesclarFeed'
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

  it('sem eco, devolve só os cards de pico', () => {
    const out = mesclarFeed(feedCards, [], [] as Mutirao[], picoMap)
    expect(out).toHaveLength(2)
    expect(out.every((u) => u.tipo === 'surf')).toBe(true)
  })
})
