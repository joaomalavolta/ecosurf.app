import { describe, it, expect } from 'vitest'
import {
  BRASIL, normalizarNome, partirCidade, localDaCidade, caixaDe,
  centroDosPontos, lerPosicao, gravarPosicao, dentroDoBrasil,
} from '../regiao'

describe('dentroDoBrasil', () => {
  it('aceita as praias que o app já conhece', () => {
    expect(dentroDoBrasil(-46.7939, -24.1917)).toBe(true) // Itanhaém/SP
    expect(dentroDoBrasil(-50.1318, -30.0035)).toBe(true) // Tramandaí/RS
    expect(dentroDoBrasil(-48.665, -28.24)).toBe(true)    // Imbituba/SC
  })

  it('recusa o ponto que mandou um mutirão para o mar da Argentina', () => {
    // O caso real: "Limpeza de Praia Tramandaí" gravado a 1.058 km do lugar.
    expect(dentroDoBrasil(-57.1792, -37.5196)).toBe(false)
  })

  it('aceita as pontas do país', () => {
    expect(dentroDoBrasil(-60.0, 4.5)).toBe(true)    // Roraima
    expect(dentroDoBrasil(-53.1, -33.7)).toBe(true)  // Chuí/RS
    expect(dentroDoBrasil(-34.8, -7.1)).toBe(true)   // João Pessoa/PB
  })

  it('recusa coordenada trocada de lugar (lat no lugar da lng)', () => {
    // Itanhaém invertida: -24.19 vira longitude e -46.79 vira latitude.
    expect(dentroDoBrasil(-24.1917, -46.7939)).toBe(false)
  })

  it('recusa zero-zero e valores impossíveis', () => {
    expect(dentroDoBrasil(0, 0)).toBe(false)
    expect(dentroDoBrasil(NaN, -24)).toBe(false)
    expect(dentroDoBrasil(-46, Infinity)).toBe(false)
  })
})

/** Os pontos que existem hoje em produção — o caso real, não um inventado. */
const PONTOS = [
  { municipio: 'Itanhaém', uf: 'SP', lat: -24.1917, lng: -46.7939 },
  { municipio: 'Itanhaém', uf: 'SP', lat: -24.1807, lng: -46.7790 },
  { municipio: 'Praia Grande', uf: 'SP', lat: -24.0501, lng: -46.5240 },
  { municipio: 'Santos', uf: 'SP', lat: -23.9704, lng: -46.3426 },
  { municipio: 'Tramandaí', uf: 'RS', lat: -30.0035, lng: -50.1317 },
  { municipio: 'Tramandaí', uf: 'RS', lat: -29.9867, lng: -50.1237 },
]

describe('normalizarNome', () => {
  it('tira acento, caixa e pontuação', () => {
    expect(normalizarNome('Itanhaém')).toBe('itanhaem')
    expect(normalizarNome('TRAMANDAÍ')).toBe('tramandai')
    expect(normalizarNome('  São  Sebastião ')).toBe('sao sebastiao')
  })

  it('não quebra com string vazia', () => {
    expect(normalizarNome('')).toBe('')
    expect(normalizarNome('   ')).toBe('')
  })
})

describe('partirCidade', () => {
  // Os três formatos que as pessoas realmente digitaram no banco.
  it('entende "Itanhaém-SP"', () => {
    expect(partirCidade('Itanhaém-SP')).toEqual({ cidade: 'itanhaem', uf: 'SP' })
  })

  it('entende "Tramandaí" sem UF', () => {
    expect(partirCidade('Tramandaí')).toEqual({ cidade: 'tramandai', uf: null })
  })

  it('entende "Imbituba" sem UF', () => {
    expect(partirCidade('Imbituba')).toEqual({ cidade: 'imbituba', uf: null })
  })

  it('aceita os outros separadores que aparecem por aí', () => {
    expect(partirCidade('Santos/SP')).toEqual({ cidade: 'santos', uf: 'SP' })
    expect(partirCidade('Santos, SP')).toEqual({ cidade: 'santos', uf: 'SP' })
    expect(partirCidade('santos sp')).toEqual({ cidade: 'santos', uf: 'SP' })
  })

  it('não confunde nome de duas letras com UF', () => {
    // "Ubá" tem 3 letras; o risco real é uma cidade terminada em sigla válida.
    expect(partirCidade('Rio de Janeiro')).toEqual({ cidade: 'rio de janeiro', uf: null })
  })

  it('devolve vazio para nulo ou branco', () => {
    expect(partirCidade(null)).toEqual({ cidade: '', uf: null })
    expect(partirCidade(undefined)).toEqual({ cidade: '', uf: null })
    expect(partirCidade('   ')).toEqual({ cidade: '', uf: null })
  })
})

describe('localDaCidade', () => {
  it('acha Tramandaí pelos picos gaúchos — o caso que motivou tudo', () => {
    const l = localDaCidade('Tramandaí', PONTOS)
    expect(l).not.toBeNull()
    expect(l!.lat).toBeCloseTo(-29.9951, 3)
    expect(l!.lng).toBeCloseTo(-50.1277, 3)
  })

  it('acha Itanhaém mesmo com a UF colada no nome', () => {
    const l = localDaCidade('Itanhaém-SP', PONTOS)
    expect(l).not.toBeNull()
    expect(l!.lat).toBeCloseTo(-24.1862, 3)
  })

  it('devolve null para cidade sem nenhum ponto conhecido', () => {
    // Imbituba/SC existe no perfil de alguém, mas não há dado lá ainda.
    // Chutar seria pior do que deixar o mapa cair no palpite seguinte.
    expect(localDaCidade('Imbituba', PONTOS)).toBeNull()
  })

  it('não casa cidade certa com UF errada', () => {
    expect(localDaCidade('Tramandaí-SP', PONTOS)).toBeNull()
  })

  it('casa quando o perfil não trouxe UF', () => {
    expect(localDaCidade('santos', PONTOS)).not.toBeNull()
  })

  it('ignora pontos sem coordenada', () => {
    const l = localDaCidade('Santos', [
      { municipio: 'Santos', uf: 'SP', lat: null, lng: null },
      { municipio: 'Santos', uf: 'SP', lat: -23.97, lng: -46.34 },
    ])
    expect(l!.lat).toBeCloseTo(-23.97, 4)
  })

  it('devolve null com cidade vazia ou lista vazia', () => {
    expect(localDaCidade('', PONTOS)).toBeNull()
    expect(localDaCidade(null, PONTOS)).toBeNull()
    expect(localDaCidade('Santos', [])).toBeNull()
  })
})

describe('caixaDe', () => {
  it('envolve todos os pontos', () => {
    const c = caixaDe(PONTOS)!
    expect(c.sw).toEqual([-50.1317, -30.0035])
    expect(c.ne).toEqual([-46.3426, -23.9704])
  })

  it('devolve null para menos de dois pontos', () => {
    expect(caixaDe([])).toBeNull()
    expect(caixaDe([PONTOS[0]])).toBeNull()
  })

  it('ignora pontos sem coordenada ao contar', () => {
    expect(caixaDe([PONTOS[0], { municipio: 'x', lat: null, lng: null }])).toBeNull()
  })
})

describe('centroDosPontos', () => {
  it('devolve a média', () => {
    const c = centroDosPontos([
      { lat: -24, lng: -46 },
      { lat: -26, lng: -48 },
    ])!
    expect(c.lat).toBeCloseTo(-25, 6)
    expect(c.lng).toBeCloseTo(-47, 6)
  })

  it('devolve null sem pontos válidos', () => {
    expect(centroDosPontos([{ lat: null, lng: null }])).toBeNull()
  })
})

describe('lerPosicao', () => {
  const agora = 1_700_000_000_000

  it('devolve a posição gravada', () => {
    const bruto = gravarPosicao({ lng: -50.1277, lat: -29.9951, zoom: 12 }, agora)
    expect(lerPosicao(bruto, agora + 1000)).toEqual({ lng: -50.1277, lat: -29.9951, zoom: 12 })
  })

  it('descarta o que passou de um mês', () => {
    const bruto = gravarPosicao({ lng: -46, lat: -24, zoom: 12 }, agora)
    expect(lerPosicao(bruto, agora + 31 * 24 * 3600 * 1000)).toBeNull()
  })

  it('descarta zoom de país — senão a próxima abertura repete o mapa-múndi', () => {
    const bruto = gravarPosicao({ lng: -52.5, lat: -14.5, zoom: 3.2 }, agora)
    expect(lerPosicao(bruto, agora)).toBeNull()
  })

  it('limita o zoom guardado, para não abrir colado no chão', () => {
    const bruto = gravarPosicao({ lng: -46, lat: -24, zoom: 19 }, agora)
    expect(lerPosicao(bruto, agora)!.zoom).toBe(15)
  })

  it('descarta lixo em vez de quebrar', () => {
    expect(lerPosicao(null)).toBeNull()
    expect(lerPosicao('')).toBeNull()
    expect(lerPosicao('não é json')).toBeNull()
    expect(lerPosicao('null')).toBeNull()
    expect(lerPosicao('[]')).toBeNull()
    expect(lerPosicao('{"lng":"-46","lat":-24,"zoom":12,"em":1}')).toBeNull()
  })

  it('descarta coordenada fora do mundo', () => {
    expect(lerPosicao(JSON.stringify({ lng: -999, lat: -24, zoom: 12, em: agora }), agora)).toBeNull()
    expect(lerPosicao(JSON.stringify({ lng: -46, lat: 99, zoom: 12, em: agora }), agora)).toBeNull()
    expect(lerPosicao(JSON.stringify({ lng: NaN, lat: -24, zoom: 12, em: agora }), agora)).toBeNull()
  })

  it('descarta sem carimbo de tempo', () => {
    expect(lerPosicao(JSON.stringify({ lng: -46, lat: -24, zoom: 12 }), agora)).toBeNull()
  })
})

describe('BRASIL', () => {
  it('é o enquadramento do país, não de uma praia', () => {
    expect(BRASIL.zoom).toBeLessThan(5)
  })
})
