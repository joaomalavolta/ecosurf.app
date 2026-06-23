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
