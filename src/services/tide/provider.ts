import type { Pico, PontoMare } from '../../types/domain'
import { curvaMareDia, alturaMare, CONSTITUINTES_PADRAO, type Constituinte } from '../../lib/tide'

/**
 * Maré é hiperlocal: a fonte é plugável. Hoje, constituintes harmônicas
 * genéricas; o caminho DHN injeta as constantes reais por estação de referência.
 */
export interface TideProvider {
  curvaDoDia(pico: Pico, data: Date): Promise<PontoMare[]>
  alturaEm(pico: Pico, iso: string): Promise<number>
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

/**
 * Constantes harmônicas por pico (amplitude/fase de cada constituinte na
 * estação de referência da DHN mais próxima). PREENCHER a partir da tábua da
 * DHN/Marinha — não há API pública gratuita, então a ingestão é manual/ETL.
 */
const CONSTANTES_DHN: Record<string, Constituinte[]> = {
  // 'praia-do-sonho': [{ nome:'M2', periodoH:12.4206, amp:..., faseDeg:... }, ...],
}

export const dhnTideProvider: TideProvider = {
  async curvaDoDia(pico) {
    return curvaMareDia(0.25, CONSTANTES_DHN[pico.id] ?? CONSTITUINTES_PADRAO)
  },
  async alturaEm(pico, iso) {
    const d = new Date(iso)
    return alturaMare(d.getHours() + d.getMinutes() / 60, CONSTANTES_DHN[pico.id] ?? CONSTITUINTES_PADRAO)
  },
}

// Usa o provider DHN: cai nas constantes genéricas até a estação ser preenchida.
export const tideProvider: TideProvider = dhnTideProvider
