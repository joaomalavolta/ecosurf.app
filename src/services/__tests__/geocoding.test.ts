import { describe, it, expect, vi, afterEach } from 'vitest'
import { buscarLugar } from '../geocoding'

/** Responde como o Photon responderia. */
function fingirPhoton(resposta: unknown, ok = true, status = 200) {
  const espiao = vi.fn().mockResolvedValue({
    ok, status, json: async () => resposta,
  } as unknown as Response)
  vi.stubGlobal('fetch', espiao)
  return espiao
}

const feature = (nome: string, lon: number, lat: number, pais?: string) => ({
  geometry: { coordinates: [lon, lat] },
  properties: { name: nome, city: nome, country: pais },
})

afterEach(() => vi.unstubAllGlobals())

describe('buscarLugar — a consulta', () => {
  it('NÃO manda lang: era o que devolvia 400 e matava a busca', async () => {
    // A instância pública do Photon é indexada em en/de/fr/it. Pedir `pt`
    // volta 400, o erro era engolido, e a busca respondia vazio SEMPRE.
    const espiao = fingirPhoton({ features: [] })
    await buscarLugar('itanhaém')
    const url = new URL(espiao.mock.calls[0][0] as string)
    expect(url.searchParams.has('lang')).toBe(false)
  })

  it('limita a busca ao Brasil pelo bbox', async () => {
    const espiao = fingirPhoton({ features: [] })
    await buscarLugar('boa vista')
    const url = new URL(espiao.mock.calls[0][0] as string)
    expect(url.searchParams.get('bbox')).toBe('-74,-34,-34,6')
  })

  it('quando há ponto de referência, ele vai junto como viés', async () => {
    const espiao = fingirPhoton({ features: [] })
    await buscarLugar('praia', { lat: -24.19, lng: -46.79 })
    const url = new URL(espiao.mock.calls[0][0] as string)
    expect(url.searchParams.get('lat')).toBe('-24.19')
    expect(url.searchParams.get('lon')).toBe('-46.79')
  })

  it('termo curto nem chega a consultar', async () => {
    const espiao = fingirPhoton({ features: [] })
    const r = await buscarLugar('it')
    expect(espiao).not.toHaveBeenCalled()
    expect(r).toEqual({ ok: true, resultados: [] })
  })
})

describe('buscarLugar — a resposta', () => {
  it('devolve os lugares do Brasil', async () => {
    fingirPhoton({ features: [feature('Itanhaém', -46.79, -24.19, 'Brasil')] })
    const r = await buscarLugar('itanhaém')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.resultados).toHaveLength(1)
      expect(r.resultados[0].lat).toBe('-24.19')
    }
  })

  it('descarta o que está fora do Brasil', async () => {
    fingirPhoton({ features: [feature('Lisboa', -9.14, 38.72, 'Portugal')] })
    const r = await buscarLugar('lisboa')
    if (r.ok) expect(r.resultados).toHaveLength(0)
  })

  it('sem país declarado, a coordenada decide — ver migration 0060', async () => {
    fingirPhoton({ features: [
      feature('ponto no mar argentino', -55, -40),
      feature('ponto no litoral paulista', -46.79, -24.19),
    ] })
    const r = await buscarLugar('ponto')
    if (r.ok) {
      expect(r.resultados).toHaveLength(1)
      expect(r.resultados[0].display_name).toContain('paulista')
    }
  })

  it('falha do serviço é DISTINGUÍVEL de busca sem resultado', async () => {
    // As duas devolviam `[]`, e a tela não tinha como explicar nada.
    fingirPhoton({}, false, 400)
    expect(await buscarLugar('itanhaém')).toEqual({ ok: false, motivo: 'servico' })

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await buscarLugar('itanhaém')).toEqual({ ok: false, motivo: 'rede' })
  })

  it('JSON quebrado conta como rede caída, não como "nada encontrado"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => { throw new Error('json') },
    } as unknown as Response))
    expect(await buscarLugar('itanhaém')).toEqual({ ok: false, motivo: 'rede' })
  })
})
