import { describe, it, expect } from 'vitest'
import {
  orientacaoDaCosta, rumo, distanciaAoSegmento, normalizarGraus, rumoDoToque,
  type Ponto, type Costa,
} from '../costa'

const R_TERRA_M = 6_371_008.8
const rad = (g: number) => (g * Math.PI) / 180

/**
 * Costa sintética: uma reta de `n` nós saindo de `origem` no rumo `rumoDeg`,
 * com `passoM` metros entre nós.
 *
 * Como as ways do OSM têm terra à esquerda e mar à direita, uma costa
 * desenhada no rumo θ tem o mar em θ + 90° — e é essa a resposta que cada
 * teste confere. Construir a geometria a partir do rumo, em vez de digitar
 * coordenadas, é o que deixa a resposta certa ser derivada e não adivinhada.
 */
function reta(origem: Ponto, rumoDeg: number, passoM: number, n: number): Costa {
  const pontos: Ponto[] = []
  for (let i = 0; i < n; i++) {
    const d = i * passoM
    const dNorte = d * Math.cos(rad(rumoDeg))
    const dLeste = d * Math.sin(rad(rumoDeg))
    pontos.push({
      lat: origem.lat + (dNorte / R_TERRA_M) * (180 / Math.PI),
      lng: origem.lng + (dLeste / (R_TERRA_M * Math.cos(rad(origem.lat)))) * (180 / Math.PI),
    })
  }
  return pontos
}

/** Anda `metros` a partir de `p` no rumo `rumoDeg`. */
function desloca(p: Ponto, rumoDeg: number, metros: number): Ponto {
  return reta(p, rumoDeg, metros, 2)[1]
}

/** Menor ângulo entre duas direções (0..180). 350° e 10° distam 20°. */
function distanciaAngular(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360)
  return d > 180 ? 360 - d : d
}

const TRAMANDAI: Ponto = { lat: -29.999, lng: -50.129 }

describe('rumo', () => {
  it('norte, leste, sul e oeste saem onde deveriam', () => {
    const p: Ponto = { lat: -24, lng: -46 }
    expect(Math.round(rumo(p, desloca(p, 0, 500)))).toBe(0)
    expect(Math.round(rumo(p, desloca(p, 90, 500)))).toBe(90)
    expect(Math.round(rumo(p, desloca(p, 180, 500)))).toBe(180)
    expect(Math.round(rumo(p, desloca(p, 270, 500)))).toBe(270)
  })
})

describe('distanciaAoSegmento', () => {
  const a: Ponto = { lat: -24, lng: -46 }
  const b = desloca(a, 0, 1000) // 1 km ao norte

  it('ponto ao lado do meio do segmento mede a perpendicular', () => {
    const meio = desloca(a, 0, 500)
    const p = desloca(meio, 90, 300) // 300 m a leste do meio
    expect(distanciaAoSegmento(p, a, b)).toBeCloseTo(300, -1)
  })

  it('além da ponta, mede até a ponta — não até a reta infinita', () => {
    const p = desloca(b, 0, 400) // 400 m além do fim
    expect(distanciaAoSegmento(p, a, b)).toBeCloseTo(400, -1)
  })
})

describe('orientacaoDaCosta — a convenção do OSM', () => {
  it('costa norte-sul desenhada para o norte: o mar fica a leste', () => {
    // Rumo 0 (norte) → mão direita aponta para 90° (leste) → é para lá que a
    // praia olha. Terra à esquerda, mar à direita.
    const costa = reta(TRAMANDAI, 0, 200, 12)
    const pico = desloca(costa[6], 90, 120)
    const o = orientacaoDaCosta([costa], pico)
    expect(o).not.toBeNull()
    expect(o!.deg).toBe(90)
  })

  it('a MESMA costa desenhada ao contrário põe o mar a oeste', () => {
    // O sentido do traço é a única informação que muda, e ela inverte a
    // resposta — é assim que a convenção carrega o lado do mar.
    const costa = reta(TRAMANDAI, 180, 200, 12)
    const pico = desloca(costa[6], 270, 120)
    const o = orientacaoDaCosta([costa], pico)
    expect(o!.deg).toBe(270)
  })

  it('costa NE-SO como a do Rio Grande do Sul: a praia olha para sudeste', () => {
    // O caso que motivou tudo. A costa gaúcha corre nordeste-sudoeste, então
    // a praia olha para ~135° — e não para os 180° que o app assumia.
    const costa = reta(TRAMANDAI, 45, 250, 14)
    const pico = desloca(costa[7], 135, 150)
    const o = orientacaoDaCosta([costa], pico)
    expect(o!.deg).toBe(135)
    expect(o!.confianca).toBeGreaterThan(0.99)
  })
})

describe('orientacaoDaCosta — média circular', () => {
  it('direções em volta do zero não caem no lado oposto', () => {
    // Duas costas que olham para 350° e 10°. A média ARITMÉTICA daria 180° —
    // exatamente o contrário do certo. A soma vetorial fica junto do zero.
    const a = reta(TRAMANDAI, 260, 200, 8)                       // olha 350°
    const b = reta(desloca(TRAMANDAI, 90, 300), 280, 200, 8)     // olha 10°
    const pico = desloca(TRAMANDAI, 20, 150)
    const o = orientacaoDaCosta([a, b], pico)
    expect(o).not.toBeNull()
    // O que importa é a distância ANGULAR: perto do zero, longe do oposto.
    // Os pesos não são simétricos (as duas costas estão a distâncias
    // diferentes do pico), então exigir 0° exato seria testar a aritmética
    // do peso, não a média circular.
    expect(distanciaAngular(o!.deg, 0)).toBeLessThanOrEqual(10)
    expect(distanciaAngular(o!.deg, 180)).toBeGreaterThan(170)
  })

  it('um trecho torto no meio de uma praia reta não move a resposta', () => {
    // Ruído de mapeamento — um degrau de dois nós — contra doze segmentos
    // alinhados. A média circular absorve.
    const reta1 = reta(TRAMANDAI, 45, 250, 8)
    const fim = reta1[reta1.length - 1]
    const degrau = [fim, desloca(fim, 100, 60), desloca(fim, 100, 60)]
    const reta2 = reta(degrau[2], 45, 250, 8)
    const pico = desloca(reta1[4], 135, 150)
    const o = orientacaoDaCosta([reta1, degrau, reta2], pico)
    expect(o).not.toBeNull()
    expect(Math.abs(o!.deg - 135)).toBeLessThanOrEqual(5)
  })
})

describe('orientacaoDaCosta — quando NÃO existe uma direção só', () => {
  it('sem costa dentro do raio, devolve null', () => {
    const costa = reta(TRAMANDAI, 45, 250, 10)
    const longe = desloca(TRAMANDAI, 135, 20_000) // 20 km mar adentro
    expect(orientacaoDaCosta([costa], longe)).toBeNull()
  })

  it('numa ponta, os dois lados se contradizem e ela se abstém', () => {
    // Uma ponta: a costa chega num rumo e sai no oposto. Os dois lados olham
    // para direções contrárias, a resultante desaba e não há UMA resposta.
    const vinda = reta(TRAMANDAI, 0, 200, 7)
    const ponta = vinda[vinda.length - 1]
    const volta = reta(ponta, 180, 200, 7)
    const pico = desloca(ponta, 90, 100)
    expect(orientacaoDaCosta([vinda, volta], pico)).toBeNull()
  })

  it('numa foz, as duas margens se encaram e ela se abstém', () => {
    // Boca da Barra, em Itanhaém, é literalmente isto: um pico numa foz de
    // rio. Ele DEVE cair no null e esperar alguém apontar na mão.
    const margemNorte = reta(TRAMANDAI, 90, 150, 6)
    const margemSul = reta(desloca(TRAMANDAI, 180, 400), 270, 150, 6)
    const pico = desloca(TRAMANDAI, 180, 200) // no meio do canal
    expect(orientacaoDaCosta([margemNorte, margemSul], pico)).toBeNull()
  })

  it('lista vazia e way de um nó só não quebram', () => {
    expect(orientacaoDaCosta([], TRAMANDAI)).toBeNull()
    expect(orientacaoDaCosta([[TRAMANDAI]], TRAMANDAI)).toBeNull()
  })
})

describe('normalizarGraus', () => {
  it('traz qualquer ângulo para [0, 360)', () => {
    expect(normalizarGraus(0)).toBe(0)
    expect(normalizarGraus(360)).toBe(0)
    expect(normalizarGraus(-90)).toBe(270)
    expect(normalizarGraus(450)).toBe(90)
    expect(normalizarGraus(-450)).toBe(270)
  })
})

describe('rumoDoToque', () => {
  // O eixo y da tela cresce para BAIXO. Tocar ACIMA do centro é dy negativo,
  // e tem de dar norte — não sul. Trocar esse sinal é o erro clássico aqui,
  // e ele espelharia a bússola inteira sem parecer quebrado.
  it('acima do centro é norte; abaixo é sul', () => {
    expect(rumoDoToque(0, -50)).toBe(0)
    expect(rumoDoToque(0, 50)).toBe(180)
  })

  it('à direita é leste; à esquerda é oeste', () => {
    expect(rumoDoToque(50, 0)).toBe(90)
    expect(rumoDoToque(-50, 0)).toBe(270)
  })

  it('as diagonais caem nos rumos intermediários', () => {
    expect(rumoDoToque(50, -50)).toBe(45)    // nordeste
    expect(rumoDoToque(50, 50)).toBe(135)    // sudeste
    expect(rumoDoToque(-50, 50)).toBe(225)   // sudoeste
    expect(rumoDoToque(-50, -50)).toBe(315)  // noroeste
  })

  it('a distância do centro não altera o rumo — só a direção importa', () => {
    expect(rumoDoToque(5, -5)).toBe(rumoDoToque(500, -500))
  })

  it('o centro exato não quebra', () => {
    expect(Number.isFinite(rumoDoToque(0, 0))).toBe(true)
  })
})
