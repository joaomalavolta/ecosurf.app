import { describe, it, expect } from 'vitest'
import { formatarArea, lerArea, AREA_MAX_M2 } from '../area'

describe('formatarArea', () => {
  it('abaixo de um hectare fica em metro quadrado', () => {
    expect(formatarArea(850)).toBe('850 m²')
    expect(formatarArea(3500)).toBe('3.500 m²')
    expect(formatarArea(9999)).toBe('9.999 m²')
  })

  it('a partir de um hectare mostra hectare e metro quadrado', () => {
    expect(formatarArea(10_000)).toBe('1 ha (10.000 m²)')
    expect(formatarArea(25_000)).toBe('2,5 ha (25.000 m²)')
  })

  it('nulo, zero e negativo não viram texto — "não informado" não é área', () => {
    expect(formatarArea(null)).toBeNull()
    expect(formatarArea(undefined)).toBeNull()
    expect(formatarArea(0)).toBeNull()
    expect(formatarArea(-5)).toBeNull()
    expect(formatarArea(Number.NaN)).toBeNull()
  })
})

describe('lerArea', () => {
  it('aceita a vírgula do teclado brasileiro', () => {
    expect(lerArea('1850,5')).toBe(1850.5)
    expect(lerArea('0,5')).toBe(0.5)
  })

  it('aceita o ponto de milhar', () => {
    expect(lerArea('1.850')).toBe(1850)
    expect(lerArea('10.000')).toBe(10000)
  })

  it('vazio é "não informado", não zero', () => {
    expect(lerArea('')).toBeNull()
    expect(lerArea('   ')).toBeNull()
  })

  it('o que não é número não vira número', () => {
    expect(lerArea('abc')).toBeNull()
    expect(lerArea('12m²')).toBeNull()
  })

  it('zero e negativo são recusados, como no CHECK do banco', () => {
    expect(lerArea('0')).toBeNull()
    expect(lerArea('-30')).toBeNull()
  })

  it('o teto do formulário é o mesmo teto da tabela', () => {
    expect(AREA_MAX_M2).toBe(10_000_000)
    // O que passa daqui o formulário barra antes de chegar no banco.
    expect(lerArea('10000001')! > AREA_MAX_M2).toBe(true)
  })
})
