import type { Pico, PontoMare } from '../../types/domain'
import { curvaMareDia, alturaMare, CONSTITUINTES_PADRAO, type Constituinte } from '../../lib/tide'
import { estacaoMaisProxima } from './stations'

/**
 * Maré é hiperlocal: a fonte é plugável. As constantes vêm da estação da
 * DHN/FEMAR mais próxima do pico (ver stations.ts). Enquanto uma estação não
 * tiver a ficha preenchida, cai nas constituintes genéricas do litoral SE/S —
 * uma aproximação honesta, nunca um valor inventado.
 */
export interface TideProvider {
  curvaDoDia(pico: Pico, data: Date): Promise<PontoMare[]>
  alturaEm(pico: Pico, iso: string): Promise<number>
}

/** Constituintes efetivas de um pico: da estação mais próxima, ou genéricas. */
export function constituintesDoPico(pico: Pico): Constituinte[] {
  const est = estacaoMaisProxima(pico.lat, pico.lng)
  return est.constituintes.length > 0 ? est.constituintes : CONSTITUINTES_PADRAO
}

export const mockTideProvider: TideProvider = {
  async curvaDoDia() {
    return curvaMareDia()
  },
  async alturaEm(_pico, iso) {
    const d = new Date(iso)
    return alturaMare(d.getHours() + d.getMinutes() / 60)
  },
}

export const dhnTideProvider: TideProvider = {
  async curvaDoDia(pico) {
    return curvaMareDia(0.25, constituintesDoPico(pico))
  },
  async alturaEm(pico, iso) {
    const d = new Date(iso)
    return alturaMare(d.getHours() + d.getMinutes() / 60, constituintesDoPico(pico))
  },
}

// Provider ativo: usa a estação mais próxima, com fallback genérico automático.
export const tideProvider: TideProvider = dhnTideProvider
