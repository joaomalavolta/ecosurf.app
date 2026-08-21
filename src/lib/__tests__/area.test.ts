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
    expect(lerArea('1.850.000')).toBe(1850000)
  })

  it('ponto decimal não vira milhar — a volta da edição depende disso', () => {
    // O banco devolve 1850.5; String() escreve com ponto. Se isto virasse
    // 18505, cada salvamento multiplicaria a área por dez.
    expect(lerArea('1850.5')).toBe(1850.5)
    expect(lerArea('0.5')).toBe(0.5)
    expect(lerArea('12.75')).toBe(12.75)
  })

  it('com os dois sinais, o último manda', () => {
    expect(lerArea('1.850,5')).toBe(1850.5)   // pt-BR
    expect(lerArea('1,850.5')).toBe(1850.5)   // en-US, colado de algum lugar
  })

  it('a ida e a volta pelo banco preservam o número', () => {
    for (const n of [850, 1850.5, 25000, 0.5, 1234567]) {
      expect(lerArea(String(n))).toBe(n)
    }
  })

  it('vazio é "não informado", não zero', () => {
    expect(lerArea('')).toBeNull()
    expect(lerArea('   ')).toBeNull()
  })

  it('o campo é OPCIONAL: sem número, o registro publica sem área', () => {
    // `null` é o que vira `area_m2 = NULL` no insert. A coluna não tem
    // NOT NULL nem default, então publicar sem área é um caminho normal —
    // não um erro a ser contornado.
    expect(lerArea('')).toBeNull()
    // E o que não dá para ler também não impede: vira "sem área", não um
    // bloqueio no meio do formulário.
    expect(lerArea('sei lá')).toBeNull()
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
