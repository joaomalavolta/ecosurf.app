import { describe, it, expect } from 'vitest'
import { frescor, rotuloFrescor, corFrescor, horaDoDia } from '../time'

describe('frescor', () => {
  const agora = new Date('2026-07-01T12:00:00')
  const horasAtras = (h: number) => new Date(agora.getTime() - h * 3_600_000).toISOString()

  it('decai ao longo do dia: ao-vivo → recente → esfriando → histórico', () => {
    expect(frescor(horasAtras(0.5), agora)).toBe('ao-vivo')
    expect(frescor(horasAtras(2), agora)).toBe('recente')
    expect(frescor(horasAtras(4), agora)).toBe('esfriando')
    expect(frescor(horasAtras(10), agora)).toBe('historico')
  })

  it('fronteiras exatas caem no nível mais frio (1h já não é ao-vivo)', () => {
    expect(frescor(horasAtras(1), agora)).toBe('recente')
    expect(frescor(horasAtras(3), agora)).toBe('esfriando')
    expect(frescor(horasAtras(6), agora)).toBe('historico')
  })

  it('cada nível tem rótulo e cor próprios', () => {
    const niveis = ['ao-vivo', 'recente', 'esfriando', 'historico'] as const
    const rotulos = new Set(niveis.map(rotuloFrescor))
    const cores = new Set(niveis.map(corFrescor))
    expect(rotulos.size).toBe(4)
    expect(cores.size).toBe(4)
  })
})

describe('horaDoDia', () => {
  it('converte ISO local em fração de hora (14:30 → 14.5)', () => {
    expect(horaDoDia('2026-07-01T14:30:00')).toBeCloseTo(14.5, 5)
    expect(horaDoDia('2026-07-01T00:00:00')).toBe(0)
    expect(horaDoDia('2026-07-01T23:45:00')).toBeCloseTo(23.75, 5)
  })
})
