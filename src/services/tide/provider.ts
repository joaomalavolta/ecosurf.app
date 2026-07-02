import type { Pico, PontoMare } from '../../types/domain'
import { curvaMareDia, alturaMare, CONSTITUINTES_PADRAO, type Constituinte } from '../../lib/tide'
import { estacaoMaisProxima } from './stations'
import { TABUAS, curvaTabua, alturaTabua, temTabua } from './tabua'

/**
 * Fonte da maré, em ordem de preferência:
 *  1. TÁBUA OFICIAL da DHN da estação mais próxima (quando existe p/ o dia);
 *  2. constituintes harmônicas da estação (quando a ficha estiver preenchida);
 *  3. constituintes genéricas do litoral SE/S (fallback honesto).
 */
export interface TideProvider {
  curvaDoDia(pico: Pico, data: Date): Promise<PontoMare[]>
  alturaEm(pico: Pico, iso: string): Promise<number>
}

export function constituintesDoPico(pico: Pico): Constituinte[] {
  const est = estacaoMaisProxima(pico.lat, pico.lng)
  return est.constituintes.length > 0 ? est.constituintes : CONSTITUINTES_PADRAO
}

function minutosDoDia(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
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
  async curvaDoDia(pico, data) {
    const est = estacaoMaisProxima(pico.lat, pico.lng)
    if (temTabua(est.id, data)) {
      const curva = curvaTabua(TABUAS[est.id], data)
      if (curva) return curva
    }
    return curvaMareDia(0.25, constituintesDoPico(pico))
  },
  async alturaEm(pico, iso) {
    const d = new Date(iso)
    const est = estacaoMaisProxima(pico.lat, pico.lng)
    if (temTabua(est.id, d)) {
      const h = alturaTabua(TABUAS[est.id], d, minutosDoDia(d))
      if (h !== null) return h
    }
    return alturaMare(d.getHours() + d.getMinutes() / 60, constituintesDoPico(pico))
  },
}

// Provider ativo: tábua oficial > constantes da estação > genérico.
export const tideProvider: TideProvider = dhnTideProvider

/** Nível médio (m) do pico: da estação mais próxima. */
export function nivelMedioDoPico(pico: Pico): number {
  return estacaoMaisProxima(pico.lat, pico.lng).nivelMedioM
}
