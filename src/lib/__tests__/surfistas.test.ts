import { describe, it, expect } from 'vitest'
import { filtrarSurfistas, normalizarBusca, type SurfistaResumo } from '../../services/usuarios'

const u = (id: string, nome: string | null, cidade: string | null = null): SurfistaResumo =>
  ({ id, nome, cidade, fotoUrl: null, criadoEm: '2026-01-01' })

const lista = [
  u('1', 'João Malavolta', 'Itanhaém'),
  u('2', 'Izadora Ribeiro', 'Santos'),
  u('3', 'Ana Paula', 'Tramandaí'),
  u('4', null, 'Ubatuba'),
]

describe('normalizarBusca', () => {
  it('tira acento e caixa', () => {
    expect(normalizarBusca('João')).toBe('joao')
    expect(normalizarBusca('  Tramandaí ')).toBe('tramandai')
  })
})

describe('filtrarSurfistas', () => {
  it('acha mesmo digitando sem acento', () => {
    expect(filtrarSurfistas(lista, 'joao').map((x) => x.id)).toEqual(['1'])
    expect(filtrarSurfistas(lista, 'tramandai').map((x) => x.id)).toEqual(['3'])
  })

  it('acha por cidade também', () => {
    expect(filtrarSurfistas(lista, 'santos').map((x) => x.id)).toEqual(['2'])
  })

  it('termo vazio devolve todo mundo', () => {
    expect(filtrarSurfistas(lista, '   ')).toHaveLength(4)
  })

  it('nome nulo não quebra a busca', () => {
    expect(() => filtrarSurfistas(lista, 'ubatuba')).not.toThrow()
    expect(filtrarSurfistas(lista, 'ubatuba').map((x) => x.id)).toEqual(['4'])
  })
})
