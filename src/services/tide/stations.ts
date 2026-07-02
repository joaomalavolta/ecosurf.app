import type { Constituinte } from '../../lib/tide'
import { ESTACOES_CHM_2026 } from './estacoes-chm'

/**
 * ESTAÇÕES MAREGRÁFICAS DE REFERÊNCIA (fonte: Catálogo de Estações
 * Maregráficas Brasileiras — FEMAR, a mesma base usada pela DHN/Marinha).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * COMO A MARÉ CHEGA A UM PICO
 * ─────────────────────────────────────────────────────────────────────────
 * A DHN/FEMAR não publica maré "por cidade", e sim por ESTAÇÃO (portos e
 * pontos de referência). Cada pico do app é ligado à estação mais próxima
 * (ver `estacaoDoPico`), e o modelo harmônico em `lib/tide.ts` calcula a
 * curva LOCALMENTE no celular — por isso o TideScrubTimeline funciona offline.
 *
 * Adicionar uma cidade nova = adicionar/vincular uma estação aqui. O motor
 * de cálculo nunca muda.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CONSTANTES: PREENCHER COM DADOS OFICIAIS DA FEMAR
 * ─────────────────────────────────────────────────────────────────────────
 * As fichas abaixo estão com `constituintes: []` DE PROPÓSITO. Enquanto
 * vazias, o pico cai automaticamente nas constantes genéricas do litoral
 * SE/S (CONSTITUINTES_PADRAO) — uma aproximação honesta, não um número
 * inventado se passando por oficial.
 *
 * Para preencher, use a ficha da estação no Catálogo FEMAR
 * (https://www.marinha.mil.br/chm/dados-do-segnav/catalogo-estacoes-mares).
 * Cada linha da ficha traz: Componente | H (amplitude, em cm) | G (fase, em graus).
 *
 * Conversão para o formato daqui:
 *   - nome     = a componente (ex.: 'M2')
 *   - periodoH = período fixo da componente (JÁ preenchido em PERIODOS_H abaixo)
 *   - amp      = H convertido de cm para METROS  (ex.: 42 cm → 0.42)
 *   - faseDeg  = G exatamente como está na ficha (graus)
 *
 * Recomendado preencher ao menos as 5 principais (M2, S2, N2, O1, K1); quanto
 * mais componentes, mais fiel a curva. Depois de preencher, rode `npm test`:
 * o teste de sanidade (tide-stations.test.ts) confere amplitude e período.
 */

/** Períodos fixos (horas) de cada componente — iguais em qualquer lugar do mundo. */
export const PERIODOS_H: Record<string, number> = {
  M2: 12.4206, S2: 12.0, N2: 12.6583, K2: 11.9672,
  K1: 23.9345, O1: 25.8193, P1: 24.0659, Q1: 26.8684,
  M3: 8.2804, M4: 6.2103, MS4: 6.1033, SA: 8766.15, SSA: 4383.08,
}

/** Atalho para montar uma constituinte a partir da ficha FEMAR (H em cm, G em graus). */
export function daFicha(nome: string, ampCm: number, faseDeg: number): Constituinte {
  return { nome, periodoH: PERIODOS_H[nome] ?? 12.4206, amp: ampCm / 100, faseDeg }
}

export interface EstacaoMare {
  id: string
  nome: string
  /** Nível médio da estação (m). Oficial só onde há tábua DHN (Santos); demais usam o genérico até ter fonte. */
  nivelMedioM: number
  /** Nº da estação no Catálogo FEMAR, para auditoria/rastreabilidade. */
  femarId?: string
  lat: number
  lng: number
  /** Vazio = ainda usa constantes genéricas. Preencher com daFicha(...) da FEMAR. */
  constituintes: Constituinte[]
}

export const ESTACOES: EstacaoMare[] = [
  {
    id: 'santos',
    nome: 'Porto de Santos (Ilha Barnabé)',
    nivelMedioM: 0.78,
    femarId: '', // preencher com o nº da ficha FEMAR
    lat: -23.9619,
    lng: -46.3042,
    // Referência para toda a Baixada Santista e o litoral central de SP,
    // incluindo Itanhaém, Mongaguá, Praia Grande, São Vicente, Guarujá.
    constituintes: [
      // Exemplo do formato (NÃO são os valores reais — apagar ao preencher):
      // daFicha('M2', 42, 95),
      // daFicha('S2', 24, 110),
      // daFicha('N2', 9,  80),
      // daFicha('O1', 11, 240),
      // daFicha('K1', 6,  120),
    ],
  },
  {
    id: 'cananeia',
    nome: 'Cananéia (IO-USP)',
    nivelMedioM: 0.78, // TODO: sem tábua DHN própria ainda; usa genérico
    femarId: '',
    lat: -25.0186,
    lng: -47.9256,
    // Referência para o litoral sul de SP (Cananéia, Ilha Comprida, Iguape).
    constituintes: [],
  },
  {
    id: 'ubatuba',
    nome: 'Ubatuba',
    nivelMedioM: 0.78, // TODO: sem tábua DHN própria ainda; usa genérico
    femarId: '',
    lat: -23.4983,
    lng: -45.1189,
    // Referência para o litoral norte de SP (Ubatuba, Caraguá, São Sebastião).
    constituintes: [],
  },
]

/** Distância aproximada em km (Haversine) — suficiente para achar a estação mais perto. */
function distanciaKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const dLat = ((bLat - aLat) * Math.PI) / 180
  const dLng = ((bLng - aLng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

/** Estação de referência de um ponto: a mais próxima geograficamente. */
export function estacaoMaisProxima(lat: number, lng: number): EstacaoMare {
  let melhor = ESTACOES[0]
  let menor = Infinity
  for (const e of ESTACOES) {
    const d = distanciaKm(lat, lng, e.lat, e.lng)
    if (d < menor) {
      menor = d
      melhor = e
    }
  }
  // Registro nacional CHM: 55 estações oficiais extras como candidatas.
  // Sem tábua ingerida elas caem no modelo genérico — mas já ancoram o pico
  // à estação certa em qualquer ponto da costa (pronto pra escala nacional).
  for (const e of ESTACOES_CHM_2026) {
    const d = distanciaKm(lat, lng, e.lat, e.lng)
    if (d < menor) {
      menor = d
      melhor = {
        id: e.id,
        nome: e.nome,
        nivelMedioM: 0.78, // genérico até a tábua da estação ser ingerida
        lat: e.lat,
        lng: e.lng,
        constituintes: [],
      }
    }
  }
  return melhor
}
