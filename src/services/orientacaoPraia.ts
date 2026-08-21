/**
 * Descobrir para que lado a praia olha, perguntando ao OpenStreetMap.
 *
 * A conta em si mora em `lib/costa.ts` e é pura — dá para testar sem rede,
 * que é como ela foi verificada. Aqui fica só o que precisa da internet:
 * montar a pergunta, entender a resposta e desistir direito quando não vier.
 *
 * ── Desistir é um resultado ──────────────────────────────────────────────────
 *
 * Toda saída deste módulo é `Orientacao | null`. Sem rede, com o Overpass fora
 * do ar, com a costa longe demais ou com a geometria ambígua (uma ponta, uma
 * foz), a resposta é null — e null significa "não sei", que o app sabe exibir.
 *
 * Essa é a lição do bug que motivou tudo: `orientacao_praia_deg` era NOT NULL
 * com default 180, então "ninguém mediu" e "medido, dá sul" eram a mesma linha
 * no banco. O app dizia "terral" com a mesma confiança nos dois casos. Um
 * palpite silencioso é pior do que uma lacuna assumida.
 */
import { orientacaoDaCosta, type Costa, type Orientacao, type Ponto } from '../lib/costa'

/**
 * Espelhos do Overpass, tentados em ordem. O serviço é mantido por
 * voluntários e cai de vez em quando; um segundo endereço custa uma linha.
 */
const ESPELHOS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/**
 * Raio da consulta. 2 km pega a praia inteira em volta do pico sem trazer o
 * litoral do município vizinho — a resposta cresce rápido e o Overpass é um
 * bem comum, mantido por doação.
 */
const RAIO_CONSULTA_M = 2_000

/** Um pico é cadastrado uma vez; 15 s de espera é aceitável nesse momento. */
const TIMEOUT_MS = 15_000

/** Formato do `out geom` do Overpass — só o que usamos. */
interface RespostaOverpass {
  elements?: { type?: string; geometry?: { lat: number; lon: number }[] }[]
}

/**
 * Extrai as ways de costa da resposta.
 *
 * Separado da chamada de propósito: é a parte que pode errar em silêncio, e
 * assim ela é testável com uma resposta gravada, sem rede.
 */
export function lerCostas(json: unknown): Costa[] {
  const r = json as RespostaOverpass
  if (!r || !Array.isArray(r.elements)) return []
  const costas: Costa[] = []
  for (const el of r.elements) {
    if (!Array.isArray(el?.geometry)) continue
    const pontos: Ponto[] = []
    for (const g of el.geometry) {
      // Coordenada quebrada não invalida a way inteira, mas também não entra:
      // um NaN no meio contaminaria a média toda.
      if (typeof g?.lat === 'number' && typeof g?.lon === 'number'
        && Number.isFinite(g.lat) && Number.isFinite(g.lon)) {
        pontos.push({ lat: g.lat, lng: g.lon })
      }
    }
    if (pontos.length >= 2) costas.push(pontos)
  }
  return costas
}

/** A pergunta ao Overpass: ways de costa em volta do ponto. */
export function consulta(lat: number, lng: number, raioM = RAIO_CONSULTA_M): string {
  const n = (v: number) => v.toFixed(6)
  return `[out:json][timeout:25];way["natural"="coastline"](around:${raioM},${n(lat)},${n(lng)});out geom;`
}

/**
 * Orientação da praia num ponto, ou `null` quando não dá para saber.
 *
 * Nunca lança: quem chama está no meio de um cadastro de pico, e uma falha
 * aqui não pode impedir alguém de registrar um pico. Sem orientação o pico
 * nasce igual — só sem o rótulo de terral até alguém apontar na bússola.
 */
export async function orientacaoPorOSM(lat: number, lng: number): Promise<Orientacao | null> {
  const corpo = consulta(lat, lng)

  for (const url of ESPELHOS) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
      let resp: Response
      try {
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(corpo)}`,
          signal: ctrl.signal,
        })
      } finally {
        clearTimeout(t)
      }
      if (!resp.ok) continue

      const costas = lerCostas(await resp.json())
      if (costas.length === 0) continue

      return orientacaoDaCosta(costas, { lat, lng })
    } catch {
      // Rede, CORS, timeout, JSON quebrado: tenta o próximo espelho.
    }
  }
  return null
}
