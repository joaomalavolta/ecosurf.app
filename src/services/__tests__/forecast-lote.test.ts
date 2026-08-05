import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buscarForecastEmLote } from '../forecast'
import type { Pico } from '../../types/domain'

const pico = (id: string, lat: number, lng: number): Pico => ({
  id, nome: id, praia: 'p', municipio: 'Santos', uf: 'SP', regiaoSurfId: 'r',
  lat, lng, orientacaoPraiaDeg: 135, fundo: 'areia',
})

/** Resposta hourly plausível da Open-Meteo para 1 local. */
const local = (onda: number) => ({
  hourly: {
    time: [new Date().toISOString().slice(0, 13) + ':00'],
    wave_height: [onda], wave_period: [11], wave_direction: [160],
    wind_speed_10m: [12], wind_direction_10m: [315],
  },
})

function mockFetch(marine: unknown, wind: unknown) {
  return vi.fn(async (url: string) => ({
    ok: true,
    json: async () => (String(url).includes('marine') ? marine : wind),
  })) as unknown as typeof fetch
}

describe('buscarForecastEmLote', () => {
  beforeEach(() => {
    // ambiente node: sem localStorage — o cache cai no catch e segue sem cache
    vi.stubGlobal('localStorage', undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lista vazia não dispara request', async () => {
    const f = mockFetch([], [])
    vi.stubGlobal('fetch', f)
    expect(await buscarForecastEmLote([])).toEqual({})
    expect(f).not.toHaveBeenCalled()
  })

  it('N picos = 2 requests, com a resposta em ARRAY', async () => {
    const picos = [pico('a', -23.9, -46.3), pico('b', -23.4, -45.0)]
    const f = mockFetch([local(1.5), local(2.5)], [local(1.5), local(2.5)])
    vi.stubGlobal('fetch', f)

    const r = await buscarForecastEmLote(picos)

    expect(f).toHaveBeenCalledTimes(2) // o ganho: 2 em vez de 2×N
    expect(r.a.ondaM).toBe(1.5)
    expect(r.b.ondaM).toBe(2.5)
    expect(r.a.fonte).toBe('open-meteo')
    // a URL leva as duas coordenadas de uma vez
    expect(String((f as unknown as { mock: { calls: string[][] } }).mock.calls[0][0])).toContain('latitude=-23.9,-23.4')
  })

  it('um pico só (resposta objeto, não array) também funciona', async () => {
    const f = mockFetch(local(0.8), local(0.8))
    vi.stubGlobal('fetch', f)
    const r = await buscarForecastEmLote([pico('solo', -23.9, -46.3)])
    expect(r.solo.ondaM).toBe(0.8)
    expect(r.solo.fonte).toBe('open-meteo')
  })

  it('erro de rede não deixa o radar vazio (cai em forecast por pico/mock)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }) as unknown as typeof fetch)
    const r = await buscarForecastEmLote([pico('x', -23.9, -46.3)])
    expect(r.x).toBeDefined()
    expect(r.x.picoId).toBe('x')
    expect(r.x.ondaM).toBeGreaterThan(0)
  })
})
