import { picosSeed, regioesSeed, ameacasSeed } from '../data/seed'
import type { Pico, RegiaoSurf, Ameaca } from '../types/domain'

/**
 * Camada de acesso a dados. Hoje lê do seed em memória; amanhã troca a
 * implementação por chamadas à API (PostGIS) ou ao Supabase sem mexer na UI.
 */

export function listarPicos(): Pico[] {
  return picosSeed.filter((p) => p.visibilidade === 'publico')
}

export function obterPico(id: string): Pico | undefined {
  return picosSeed.find((p) => p.id === id)
}

export function listarRegioes(): RegiaoSurf[] {
  return regioesSeed
}

/** Eixo diário primário — favoritos do usuário (mock). */
export function favoritos(): Pico[] {
  const ids = ['praia-do-sonho', 'praia-dos-pescadores']
  return picosSeed.filter((p) => ids.includes(p.id))
}

export function listarAmeacas(): Ameaca[] {
  return ameacasSeed
}

export function ameacasDoPico(picoId: string): Ameaca[] {
  return ameacasSeed.filter((a) => a.picoId === picoId)
}
