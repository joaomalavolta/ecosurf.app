import { describe, it, expect } from 'vitest'
import { lerCostas, consulta } from '../orientacaoPraia'

describe('consulta', () => {
  it('pede ways de costa em volta do ponto', () => {
    const q = consulta(-29.999, -50.129)
    expect(q).toContain('way["natural"="coastline"]')
    expect(q).toContain('around:2000,-29.999000,-50.129000')
    expect(q).toContain('out geom')
  })

  it('as coordenadas não saem em notação científica', () => {
    // Um lng de -0.0000004 viraria "-4e-7" com String(), e o Overpass
    // recusaria a consulta inteira.
    expect(consulta(-0.0000004, -0.0000004)).toContain('around:2000,-0.000000,-0.000000')
  })
})

describe('lerCostas', () => {
  it('lê as ways de uma resposta out geom', () => {
    const costas = lerCostas({
      elements: [
        { type: 'way', geometry: [{ lat: -30, lon: -50 }, { lat: -29.99, lon: -50.01 }] },
        { type: 'way', geometry: [{ lat: -29.98, lon: -50.02 }, { lat: -29.97, lon: -50.03 }] },
      ],
    })
    expect(costas).toHaveLength(2)
    expect(costas[0][0]).toEqual({ lat: -30, lng: -50 })
  })

  it('descarta way de um nó só — não dá segmento, não dá direção', () => {
    const costas = lerCostas({ elements: [{ type: 'way', geometry: [{ lat: -30, lon: -50 }] }] })
    expect(costas).toEqual([])
  })

  it('coordenada quebrada sai sem levar a way junto', () => {
    const costas = lerCostas({
      elements: [{
        type: 'way',
        geometry: [
          { lat: -30, lon: -50 },
          { lat: Number.NaN, lon: -50.01 },
          { lat: -29.98, lon: -50.02 },
        ],
      }],
    })
    // Ficam os dois nós bons: um NaN no meio contaminaria a média inteira.
    expect(costas).toHaveLength(1)
    expect(costas[0]).toHaveLength(2)
  })

  it('resposta vazia, malformada ou de outro tipo devolve lista vazia', () => {
    expect(lerCostas({ elements: [] })).toEqual([])
    expect(lerCostas({})).toEqual([])
    expect(lerCostas(null)).toEqual([])
    expect(lerCostas('não é json de overpass')).toEqual([])
    expect(lerCostas({ elements: [{ type: 'node' }] })).toEqual([])
  })
})
