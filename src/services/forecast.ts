import type { Forecast, Pico } from '../types/domain'
import { classificarVento } from '../lib/surf'
import { alturaMare, faseMare } from '../lib/tide'

/**
 * Forecast nacional via Open-Meteo (grátis, sem chave, cobertura global —
 * é o que viabiliza o radar de surf em todo o litoral desde o dia 1).
 *
 * Observações:
 *  - Open-Meteo NÃO fornece maré astronômica. A maré aqui ainda é o mock
 *    (lib/tide) — trocar por DHN por estação de referência.
 *  - Sempre cai em mock no erro/offline: o radar nunca pode aparecer vazio
 *    na praia com 3G ruim (offline-first).
 */

const TZ = 'America%2FSao_Paulo'

function indiceHoraAtual(times: string[]): number {
  const agora = Date.now()
  let melhor = 0
  let dist = Infinity
  for (let i = 0; i < times.length; i++) {
    const d = Math.abs(new Date(times[i]).getTime() - agora)
    if (d < dist) {
      dist = d
      melhor = i
    }
  }
  return melhor
}

export async function buscarForecast(pico: Pico): Promise<Forecast> {
  try {
    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${pico.lat}&longitude=${pico.lng}` +
      `&hourly=wave_height,wave_period,wave_direction&timezone=${TZ}`
    const windUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${pico.lat}&longitude=${pico.lng}` +
      `&hourly=wind_speed_10m,wind_direction_10m&timezone=${TZ}`

    const [mRes, wRes] = await Promise.all([fetch(marineUrl), fetch(windUrl)])
    if (!mRes.ok || !wRes.ok) throw new Error('forecast http')

    const marine = await mRes.json()
    const wind = await wRes.json()

    const i = indiceHoraAtual(marine.hourly.time as string[])
    const ondaM = Number(marine.hourly.wave_height?.[i] ?? 0)
    const periodoS = Number(marine.hourly.wave_period?.[i] ?? 0)
    const direcaoOndaDeg = Number(marine.hourly.wave_direction?.[i] ?? 0)
    const velocidadeKmh = Number(wind.hourly.wind_speed_10m?.[i] ?? 0)
    const direcaoVentoDeg = Number(wind.hourly.wind_direction_10m?.[i] ?? 0)

    const agora = new Date()
    const h = agora.getHours() + agora.getMinutes() / 60
    
    // Maré via provider local (constants DHN)
    const { tideProvider } = await import('./tide/provider')
    const alturaM = Number((await tideProvider.alturaEm(pico, agora.toISOString())).toFixed(2))
    const fase = faseMare(h) // Mantém a lógica de fase baseada na altura atual

    return {
      picoId: pico.id,
      emitidoEm: agora.toISOString(),
      ondaM,
      periodoS,
      direcaoOndaDeg,
      vento: {
        velocidadeKmh,
        direcaoDeg: direcaoVentoDeg,
        tipo: classificarVento(direcaoVentoDeg, pico.orientacaoPraiaDeg, velocidadeKmh),
      },
      mare: { alturaM, fase },
      fonte: 'open-meteo',
    }
  } catch {
    return forecastMock(pico)
  }
}

/* ─────────── Lote + cache: a abertura do Radar em 2 requests ───────────
 * O Radar pedia marine+wind POR pico (2×N requests a cada abertura). A
 * Open-Meteo aceita várias coordenadas numa chamada só, então N picos viram
 * 2 requests — e o cache de 30min evita repetir tudo a cada visita (previsão
 * horária não muda de minuto em minuto).
 */

const CACHE_KEY = 'ecosurf-forecast-cache'
const TTL_MS = 30 * 60 * 1000
const LOTE = 25 // limite de coordenadas por chamada, p/ não estourar a URL

type CacheEntry = { em: number; f: Forecast }

function lerCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, CacheEntry>
  } catch {
    return {}
  }
}

function gravarCache(c: Record<string, CacheEntry>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c))
  } catch { /* quota/privado: seguir sem cache */ }
}

/** Normaliza a resposta da Open-Meteo: com N coordenadas ela devolve array. */
function comoLista(json: unknown, n: number): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[]
  return n === 1 ? [json as Record<string, unknown>] : []
}

interface HourlyMarine { time: string[]; wave_height?: number[]; wave_period?: number[]; wave_direction?: number[] }
interface HourlyWind { time: string[]; wind_speed_10m?: number[]; wind_direction_10m?: number[] }

/**
 * Forecast de vários picos com 2 requests (+ cache). Devolve um mapa por id.
 * Se o lote falhar (rede ou formato inesperado), tenta pico a pico pelo
 * caminho antigo — e só aí cai no mock. O radar nunca aparece vazio.
 */
export async function buscarForecastEmLote(picos: Pico[]): Promise<Record<string, Forecast>> {
  const saida: Record<string, Forecast> = {}
  if (picos.length === 0) return saida

  const cache = lerCache()
  const agoraMs = Date.now()
  const pendentes: Pico[] = []
  for (const p of picos) {
    const c = cache[p.id]
    if (c && agoraMs - c.em < TTL_MS) saida[p.id] = c.f
    else pendentes.push(p)
  }
  if (pendentes.length === 0) return saida

  for (let ini = 0; ini < pendentes.length; ini += LOTE) {
    const grupo = pendentes.slice(ini, ini + LOTE)
    const lats = grupo.map((p) => p.lat).join(',')
    const lngs = grupo.map((p) => p.lng).join(',')
    try {
      const [mRes, wRes] = await Promise.all([
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lngs}` +
          `&hourly=wave_height,wave_period,wave_direction&timezone=${TZ}`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}` +
          `&hourly=wind_speed_10m,wind_direction_10m&timezone=${TZ}`),
      ])
      if (!mRes.ok || !wRes.ok) throw new Error('forecast http')
      const marines = comoLista(await mRes.json(), grupo.length)
      const winds = comoLista(await wRes.json(), grupo.length)

      const agora = new Date()
      const h = agora.getHours() + agora.getMinutes() / 60
      const { tideProvider } = await import('./tide/provider')

      await Promise.all(grupo.map(async (pico, k) => {
        const marine = marines[k]?.hourly as HourlyMarine | undefined
        const wind = winds[k]?.hourly as HourlyWind | undefined
        // Formato inesperado (a API pode mudar): cai no caminho por pico, que
        // traz dado REAL. Nunca servir mock sem antes tentar o jeito antigo.
        if (!marine?.time || !wind) {
          const f = await buscarForecast(pico)
          saida[pico.id] = f
          if (f.fonte === 'open-meteo') cache[pico.id] = { em: agoraMs, f }
          return
        }

        const i = indiceHoraAtual(marine.time)
        const velocidadeKmh = Number(wind.wind_speed_10m?.[i] ?? 0)
        const direcaoVentoDeg = Number(wind.wind_direction_10m?.[i] ?? 0)
        const alturaM = Number((await tideProvider.alturaEm(pico, agora.toISOString())).toFixed(2))

        const f: Forecast = {
          picoId: pico.id,
          emitidoEm: agora.toISOString(),
          ondaM: Number(marine.wave_height?.[i] ?? 0),
          periodoS: Number(marine.wave_period?.[i] ?? 0),
          direcaoOndaDeg: Number(marine.wave_direction?.[i] ?? 0),
          vento: {
            velocidadeKmh,
            direcaoDeg: direcaoVentoDeg,
            tipo: classificarVento(direcaoVentoDeg, pico.orientacaoPraiaDeg, velocidadeKmh),
          },
          mare: { alturaM, fase: faseMare(h) },
          fonte: 'open-meteo',
        }
        saida[pico.id] = f
        cache[pico.id] = { em: agoraMs, f }
      }))
    } catch {
      // Lote falhou: tenta pico a pico (o buscarForecast já cai em mock só
      // no último caso, então offline continua funcionando).
      await Promise.all(grupo.map(async (p) => {
        const f = await buscarForecast(p)
        saida[p.id] = f
        if (f.fonte === 'open-meteo') cache[p.id] = { em: agoraMs, f }
      }))
    }
  }

  gravarCache(cache)
  return saida
}

export function forecastMock(pico: Pico): Forecast {
  const h = new Date().getHours() + new Date().getMinutes() / 60
  const direcaoVentoDeg = (pico.orientacaoPraiaDeg + 180) % 360 // terral fictício
  return {
    picoId: pico.id,
    emitidoEm: new Date().toISOString(),
    ondaM: 1.1,
    periodoS: 10,
    direcaoOndaDeg: 160,
    vento: {
      velocidadeKmh: 9,
      direcaoDeg: direcaoVentoDeg,
      tipo: classificarVento(direcaoVentoDeg, pico.orientacaoPraiaDeg, 9),
    },
    mare: { alturaM: Number(alturaMare(h).toFixed(2)), fase: faseMare(h) },
    fonte: 'mock',
  }
}
