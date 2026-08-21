/**
 * Para que lado a praia olha, deduzido da linha de costa.
 *
 * Esta é a entrada que faltava para o terral fazer sentido. `classificarVento`
 * sempre soube a conta certa — comparar de onde o vento vem com o lado do mar
 * aberto —, mas recebia 180° para todo pico do Brasil, porque era o default da
 * coluna e ninguém nunca preencheu. Um pico em Tramandaí, que olha para sudeste,
 * era tratado como se olhasse para o sul: vento de nordeste virava "terral" e o
 * oeste, que é o terral de verdade lá, era rebaixado a "lateral".
 *
 * ── A convenção que torna isto possível ──────────────────────────────────────
 *
 * No OpenStreetMap, uma way `natural=coastline` é desenhada com TERRA À
 * ESQUERDA e ÁGUA À DIREITA, na ordem dos nós. É regra, não costume — o próprio
 * ferramental do OSM valida e acusa quem inverte.
 *
 * Isso resolve o problema difícil de graça. Sem a convenção, saber de que lado
 * fica o mar exigiria um polígono de terra e um teste ponto-em-polígono. Com
 * ela, basta a direção do traço: se o rumo do segmento é θ, o mar está em
 * θ + 90°, e é para lá que a praia olha.
 *
 * ── Por que vários segmentos, e não o mais próximo ───────────────────────────
 *
 * Um segmento sozinho carrega o ruído de quem mapeou: um pedaço de molhe, um
 * degrau de dois nós, um detalhe de pedra. A média circular de vários segmentos
 * próximos cancela esse ruído.
 *
 * E dá de brinde a medida de confiança que evita repetir o erro original. A
 * resultante da média (`R`, entre 0 e 1) diz o quanto os segmentos concordam:
 * numa praia reta, todos apontam para o mesmo lado e R fica perto de 1; numa
 * ponta, numa foz de rio ou numa baía estreita, eles se contradizem e R
 * despenca. R baixo não é um número ruim a ser usado assim mesmo — é a
 * geometria dizendo que ali não existe UMA direção. Nesse caso devolvemos
 * null, e quem conhece o lugar aponta na mão.
 *
 * Boca da Barra, em Itanhaém, é literalmente uma foz: é um pico que DEVE cair
 * no null.
 */

export interface Ponto {
  lat: number
  lng: number
}

/** Uma way de costa do OSM: nós em ordem, terra à esquerda, mar à direita. */
export type Costa = Ponto[]

export interface Orientacao {
  /** Direção do mar aberto, em graus (0 = norte, 90 = leste). */
  deg: number
  /**
   * Concordância entre os segmentos, de 0 a 1 — a resultante da média
   * circular. Perto de 1, costa reta; perto de 0, os segmentos se contradizem.
   */
  confianca: number
  /** Quantos segmentos entraram na média. */
  segmentos: number
}

const R_TERRA_M = 6_371_008.8
const rad = (g: number) => (g * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Normaliza para [0, 360). */
export function normalizarGraus(g: number): number {
  return ((g % 360) + 360) % 360
}

/**
 * De um deslocamento na tela para um rumo de bússola.
 *
 * Duas convenções se cruzam aqui, e é por isso que a conta mora numa função
 * com nome: na tela, x cresce para a direita e **y cresce para BAIXO**; numa
 * bússola, o zero é em cima e os graus crescem no sentido horário. O `-dy`
 * desvira o eixo vertical, e trocar a ordem dos argumentos de `atan2` gira o
 * zero do leste (onde a matemática o põe) para o norte.
 *
 * `dx`/`dy` são medidos a partir do centro do controle.
 */
export function rumoDoToque(dx: number, dy: number): number {
  return normalizarGraus((Math.atan2(dx, -dy) * 180) / Math.PI)
}

/**
 * Rumo inicial de `a` para `b`, em graus (0 = norte, sentido horário).
 * Fórmula esférica: nas distâncias de um segmento de costa a diferença para a
 * aproximação plana é fração de grau, mas ela não custa nada aqui.
 */
export function rumo(a: Ponto, b: Ponto): number {
  const φ1 = rad(a.lat)
  const φ2 = rad(b.lat)
  const Δλ = rad(b.lng - a.lng)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return normalizarGraus(deg(Math.atan2(y, x)))
}

/**
 * Projeção local em metros. Numa janela de poucos quilômetros o erro é
 * desprezível, e ela deixa a distância ponto-segmento ser álgebra simples.
 */
function paraMetros(p: Ponto, origem: Ponto): { x: number; y: number } {
  return {
    x: rad(p.lng - origem.lng) * R_TERRA_M * Math.cos(rad(origem.lat)),
    y: rad(p.lat - origem.lat) * R_TERRA_M,
  }
}

/** Distância, em metros, de `p` ao segmento `a`–`b`. */
export function distanciaAoSegmento(p: Ponto, a: Ponto, b: Ponto): number {
  const P = paraMetros(p, p)
  const A = paraMetros(a, p)
  const B = paraMetros(b, p)
  const vx = B.x - A.x
  const vy = B.y - A.y
  const len2 = vx * vx + vy * vy
  if (len2 === 0) return Math.hypot(P.x - A.x, P.y - A.y)
  // t projeta P na reta AB, preso ao intervalo [0,1] para não sair do segmento.
  let t = ((P.x - A.x) * vx + (P.y - A.y) * vy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(P.x - (A.x + t * vx), P.y - (A.y + t * vy))
}

/** Comprimento do segmento em metros. */
function comprimento(a: Ponto, b: Ponto): number {
  const A = paraMetros(a, a)
  const B = paraMetros(b, a)
  return Math.hypot(B.x - A.x, B.y - A.y)
}

export interface OpcoesOrientacao {
  /** Raio de busca a partir do pico. Fora dele, o segmento não conta. */
  raioM?: number
  /** Abaixo desta concordância, a costa não tem uma direção só. */
  confiancaMinima?: number
}

const PADRAO: Required<OpcoesOrientacao> = {
  raioM: 1_500,
  // 0,80 corresponde a um espalhamento de ~±36° entre os segmentos. Acima
  // disso a praia é reta o bastante para uma direção só fazer sentido; abaixo,
  // estamos numa ponta, numa foz ou numa enseada fechada.
  confiancaMinima: 0.8,
}

/**
 * Direção do mar aberto a partir das ways de costa vizinhas.
 *
 * Devolve `null` quando não há costa por perto ou quando os segmentos não
 * concordam — os dois casos em que inventar um número seria repetir o bug que
 * esta função existe para corrigir.
 */
export function orientacaoDaCosta(
  costas: Costa[],
  pico: Ponto,
  opcoes: OpcoesOrientacao = {},
): Orientacao | null {
  const { raioM, confiancaMinima } = { ...PADRAO, ...opcoes }

  // Soma vetorial em vez de média aritmética: 350° e 10° são vizinhos, e
  // somar os graus daria 180° — exatamente a direção oposta à verdadeira.
  let sx = 0
  let sy = 0
  let peso = 0
  let n = 0

  for (const costa of costas) {
    for (let i = 0; i + 1 < costa.length; i++) {
      const a = costa[i]
      const b = costa[i + 1]
      const d = distanciaAoSegmento(pico, a, b)
      if (d > raioM) continue

      const compr = comprimento(a, b)
      if (compr === 0) continue

      // A convenção do OSM: mar à direita de quem caminha na ordem dos nós.
      const olhaPara = rad(normalizarGraus(rumo(a, b) + 90))

      // Peso: segmento longo descreve melhor o traço geral da costa, e o que
      // está perto do pico descreve melhor AQUELE pedaço de praia. O +1 evita
      // que um segmento a um metro de distância domine a soma sozinho.
      const p = compr / (1 + d)
      sx += Math.cos(olhaPara) * p
      sy += Math.sin(olhaPara) * p
      peso += p
      n++
    }
  }

  if (n === 0 || peso === 0) return null

  const resultante = Math.hypot(sx, sy) / peso
  if (resultante < confiancaMinima) return null

  return {
    deg: Math.round(normalizarGraus(deg(Math.atan2(sy, sx)))),
    confianca: Number(resultante.toFixed(3)),
    segmentos: n,
  }
}
