import type { Pico, PontoMare } from '../../types/domain'
import { curvaMareDia, alturaMare, CONSTITUINTES_PADRAO, type Constituinte } from '../../lib/tide'
import { alturaMareAstro, curvaDiaAstro } from '../../lib/tide-astro'
import { estacaoMaisProxima } from './stations'
import { estacaoBndoMaisProxima } from './estacoes-bndo'
import { TABUAS, curvaTabua, alturaTabua, temTabua } from './tabua'

/**
 * Fonte da maré, em ordem de preferência:
 *  1. TÁBUA OFICIAL da DHN da estação mais próxima (quando existe p/ o dia);
 *  2. MOTOR ASTRONÔMICO com as constantes harmônicas REAIS da estação
 *     BNDO/GOOS mais próxima (26 estações, litoral inteiro) — muda com a
 *     data, alterna sizígia/quadratura e atrasa ~50 min/dia como a maré real;
 *  3. constituintes genéricas do litoral SE/S (último recurso, estático).
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
    const tabuaEst = estacaoMaisProxima(pico.lat, pico.lng)
    if (temTabua(tabuaEst.id, data)) {
      const curva = curvaTabua(TABUAS[tabuaEst.id], data)
      if (curva) return curva
    }
    const bndo = estacaoBndoMaisProxima(pico.lat, pico.lng)
    return curvaDiaAstro(data, bndo.constantes, bndo.nivelMedioM)
  },
  async alturaEm(pico, iso) {
    const d = new Date(iso)
    const tabuaEst = estacaoMaisProxima(pico.lat, pico.lng)
    if (temTabua(tabuaEst.id, d)) {
      const h = alturaTabua(TABUAS[tabuaEst.id], d, minutosDoDia(d))
      if (h !== null) return h
    }
    const bndo = estacaoBndoMaisProxima(pico.lat, pico.lng)
    return alturaMareAstro(d.getTime(), bndo.constantes, bndo.nivelMedioM)
  },
}

// Provider ativo: tábua oficial > motor astronômico (estação real) > genérico.
export const tideProvider: TideProvider = dhnTideProvider

/** Nível médio (m) do pico: da estação com constantes reais mais próxima. */
export function nivelMedioDoPico(pico: Pico): number {
  return estacaoBndoMaisProxima(pico.lat, pico.lng).nivelMedioM
}
