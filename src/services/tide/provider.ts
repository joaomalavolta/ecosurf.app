import type { Pico, PontoMare } from '../../types/domain'
import { curvaMareDia, alturaMare } from '../../lib/tide'

/**
 * Maré é hiperlocal: não dá para interpolar nacionalmente. Por isso a fonte
 * é plugável — hoje um modelo senoidal; amanhã a DHN por estação, sem tocar a UI.
 */
export interface TideProvider {
  curvaDoDia(pico: Pico, data: Date): Promise<PontoMare[]>
  alturaEm(pico: Pico, iso: string): Promise<number>
}

/** Modelo senoidal (default até a DHN entrar). */
export const mockTideProvider: TideProvider = {
  async curvaDoDia() {
    return curvaMareDia()
  },
  async alturaEm(_pico, iso) {
    const d = new Date(iso)
    return alturaMare(d.getHours() + d.getMinutes() / 60)
  },
}

/**
 * Provedor DHN (Marinha / Centro de Hidrografia) — A IMPLEMENTAR.
 * Requer mapear cada pico à estação de referência mais próxima e aplicar as
 * constantes harmônicas. Enquanto não existir, delega ao mock.
 */
export const dhnTideProvider: TideProvider = {
  async curvaDoDia(pico, data) {
    // TODO: pico -> estação DHN + harmônicas
    return mockTideProvider.curvaDoDia(pico, data)
  },
  async alturaEm(pico, iso) {
    return mockTideProvider.alturaEm(pico, iso)
  },
}

export const tideProvider: TideProvider = mockTideProvider
