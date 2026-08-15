import { describe, it, expect } from 'vitest'
import { acaoEncerrada, rotuloStatusAcao } from '../agenda'

const agora = new Date(2026, 7, 7, 10, 0) // 7 de agosto de 2026, 10h local

describe('acaoEncerrada', () => {
  it('ontem já encerrou', () => {
    expect(acaoEncerrada('2026-08-06T15:00:00Z', agora)).toBe(true)
  })

  it('o próprio dia continua aberto (mesmo de manhã cedo)', () => {
    expect(acaoEncerrada('2026-08-07T00:30:00', agora)).toBe(false)
  })

  it('amanhã está aberto', () => {
    expect(acaoEncerrada('2026-08-08T09:00:00', agora)).toBe(false)
  })

  it('sem data ou data inválida não bloqueia', () => {
    expect(acaoEncerrada(null, agora)).toBe(false)
    expect(acaoEncerrada('', agora)).toBe(false)
    expect(acaoEncerrada('nao-e-data', agora)).toBe(false)
  })
})

describe('rotuloStatusAcao', () => {
  it('agendado com data velha vira Encerrado', () => {
    // o caso real: mutirões de junho seguiam exibindo "Agendado" em agosto
    expect(rotuloStatusAcao('agendado', '2026-06-25T15:00:00Z')).toBe('Encerrado')
  })

  it('cancelado e realizado mandam mais que a data', () => {
    expect(rotuloStatusAcao('cancelado', '2026-06-25T15:00:00Z')).toBe('Cancelado')
    expect(rotuloStatusAcao('realizado', '2026-06-25T15:00:00Z')).toBe('Realizado')
  })
})
