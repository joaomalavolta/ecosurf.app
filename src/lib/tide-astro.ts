/**
 * MOTOR HARMÔNICO ASTRONÔMICO — previsão de maré real por data.
 *
 * O motor anterior somava cossenos apenas sobre a "hora do dia": a curva de
 * hoje era idêntica à de amanhã, quando a maré real atrasa ~50 min/dia e
 * alterna sizígia/quadratura na quinzena. Este motor calcula os ARGUMENTOS DE
 * EQUILÍBRIO (V₀+u) e os FATORES NODAIS (f) de cada constituinte na data
 * pedida — o mesmo método das tábuas oficiais (Schureman/DHN) e do XTide.
 *
 *   h(t) = Z₀ + Σ  f·H·cos( σ·Δt + V₀ + u − G )
 *
 * onde H (amplitude) e G (fase de Greenwich) são as constantes harmônicas da
 * ESTAÇÃO — dados publicados (BNDO/Marinha; Soares 2013, UFSC) — e V₀, u, f
 * derivam das posições médias de Lua e Sol no instante.
 *
 * Validado contra a tábua oficial DHN de Santos 2026 (ver tide-astro.test.ts).
 */

export interface ConstituinteG {
  /** Amplitude em metros. */
  amp: number
  /** Fase de Greenwich (época g) em graus — como publicada nas fichas. */
  gDeg: number
}

export type ConstantesEstacao = Record<string, ConstituinteG>

const RAD = Math.PI / 180

/** Horas desde 2000-01-01 00:00 UTC (época J2000 civil, suficiente aqui). */
function horasDesde2000(msUTC: number): number {
  return (msUTC - Date.UTC(2000, 0, 1)) / 3600000
}

/**
 * Longitudes médias (graus) — polinômios de Schureman/Meeus reduzidos ao
 * termo linear (erro < 0,01° no século, irrelevante para maré costeira):
 *   s = Lua · h = Sol · p = perigeu lunar · N = nó ascendente lunar
 */
function longitudesMedias(msUTC: number) {
  const d = horasDesde2000(msUTC) / 24 // dias desde J2000 civil
  const wrap = (x: number) => ((x % 360) + 360) % 360
  return {
    s: wrap(211.728 + 13.176396 * d),
    h: wrap(279.974 + 0.98564736 * d),
    p: wrap(83.298 + 0.111404 * d),
    N: wrap(125.071 - 0.052954 * d),
  }
}

/**
 * Catálogo de constituintes: velocidade σ (grau/hora) e o argumento de
 * equilíbrio V como combinação [nτ, ns, nh, np, +k·90°], onde
 * τ = 15·t − s + h é o tempo lunar médio (t em horas UTC).
 * `nodal` indica a família de correção f/u.
 */
interface DefConstituinte {
  sigma: number
  v: [number, number, number, number, number] // [τ, s, h, p, +graus]
  nodal: 'M2' | 'O1' | 'K1' | 'K2' | 'nenhum' | 'M2x2' | 'M2x3' | 'M2x4' | 'M2K1' | 'M2O1' | 'M2K2' | 'M2x2K2'
}

export const CATALOGO: Record<string, DefConstituinte> = {
  // Longo período (Sol) — sem correção nodal relevante
  SA:  { sigma: 0.0410686, v: [0, 0, 1, 0, 0], nodal: 'nenhum' },
  SSA: { sigma: 0.0821373, v: [0, 0, 2, 0, 0], nodal: 'nenhum' },

  // Diurnas
  Q1:  { sigma: 13.3986609, v: [1, -2, 0, 1, 270], nodal: 'O1' },
  O1:  { sigma: 13.9430356, v: [1, -1, 0, 0, 270], nodal: 'O1' },
  P1:  { sigma: 14.9589314, v: [1, 1, -2, 0, 270], nodal: 'nenhum' },
  K1:  { sigma: 15.0410686, v: [1, 1, 0, 0, 90], nodal: 'K1' },
  J1:  { sigma: 15.5854433, v: [1, 2, 0, -1, 90], nodal: 'K1' },

  // Semidiurnas
  '2N2': { sigma: 27.8953548, v: [2, -2, 0, 2, 0], nodal: 'M2' },
  MU2: { sigma: 27.9682084, v: [2, -2, 2, 0, 0], nodal: 'M2' },
  N2:  { sigma: 28.4397295, v: [2, -1, 0, 1, 0], nodal: 'M2' },
  NU2: { sigma: 28.5125831, v: [2, -1, 2, -1, 0], nodal: 'M2' },
  M2:  { sigma: 28.9841042, v: [2, 0, 0, 0, 0], nodal: 'M2' },
  L2:  { sigma: 29.5284789, v: [2, 1, 0, -1, 180], nodal: 'M2' }, // f/u ≈ M2 (aprox.)
  T2:  { sigma: 29.9589333, v: [2, 2, -3, 0, 0], nodal: 'nenhum' },
  S2:  { sigma: 30.0, v: [2, 2, -2, 0, 0], nodal: 'nenhum' },
  K2:  { sigma: 30.0821373, v: [2, 2, 0, 0, 0], nodal: 'K2' },

  // Terdiurnas (M3 = 1,5·M2; compostas somam V e u, multiplicam f)
  M3:  { sigma: 43.4761563, v: [3, 0, 0, 0, 0], nodal: 'M2' }, // f(M3)≈f(M2)^1.5 → aprox f(M2)
  MO3: { sigma: 42.9271398, v: [3, -1, 0, 0, 270], nodal: 'M2O1' },
  MK3: { sigma: 44.0251729, v: [3, 1, 0, 0, 90], nodal: 'M2K1' },
  SO3: { sigma: 43.9430356, v: [3, 1, -2, 0, 270], nodal: 'O1' },
  SK3: { sigma: 45.0410686, v: [3, 3, -2, 0, 90], nodal: 'K1' },

  // Quarto-diurnas e superiores (águas rasas)
  MN4: { sigma: 57.4238337, v: [4, -1, 0, 1, 0], nodal: 'M2x2' },
  M4:  { sigma: 57.9682084, v: [4, 0, 0, 0, 0], nodal: 'M2x2' },
  SN4: { sigma: 58.4397295, v: [4, 1, -2, 1, 0], nodal: 'M2' },
  MS4: { sigma: 58.9841042, v: [4, 2, -2, 0, 0], nodal: 'M2' },
  MK4: { sigma: 59.0662415, v: [4, 2, 0, 0, 0], nodal: 'M2K2' },
  S4:  { sigma: 60.0, v: [4, 4, -4, 0, 0], nodal: 'nenhum' },
  '2MN6': { sigma: 86.4079379, v: [6, -1, 0, 1, 0], nodal: 'M2x3' },
  M6:  { sigma: 86.9523127, v: [6, 0, 0, 0, 0], nodal: 'M2x3' },
  '2MS6': { sigma: 87.9682084, v: [6, 2, -2, 0, 0], nodal: 'M2x2' },
  '2SM6': { sigma: 88.9841042, v: [6, 4, -4, 0, 0], nodal: 'M2' },
  M8:  { sigma: 115.9364169, v: [8, 0, 0, 0, 0], nodal: 'M2x4' },
}

/** Fatores nodais f e correções u (graus) — fórmulas de Schureman. */
function nodais(N: number) {
  const n = N * RAD
  const fM2 = 1.0004 - 0.0373 * Math.cos(n) + 0.0002 * Math.cos(2 * n)
  const uM2 = -2.14 * Math.sin(n)
  const fO1 = 1.0089 + 0.1871 * Math.cos(n) - 0.0147 * Math.cos(2 * n) + 0.0014 * Math.cos(3 * n)
  const uO1 = 10.8 * Math.sin(n) - 1.34 * Math.sin(2 * n) + 0.19 * Math.sin(3 * n)
  const fK1 = 1.006 + 0.115 * Math.cos(n) - 0.0088 * Math.cos(2 * n) + 0.0006 * Math.cos(3 * n)
  const uK1 = -8.86 * Math.sin(n) + 0.68 * Math.sin(2 * n) - 0.07 * Math.sin(3 * n)
  const fK2 = 1.0241 + 0.2863 * Math.cos(n) + 0.0083 * Math.cos(2 * n) - 0.0015 * Math.cos(3 * n)
  const uK2 = -17.74 * Math.sin(n) + 0.68 * Math.sin(2 * n) - 0.04 * Math.sin(3 * n)
  return { fM2, uM2, fO1, uO1, fK1, uK1, fK2, uK2 }
}

function fuDe(tipo: DefConstituinte['nodal'], nd: ReturnType<typeof nodais>): { f: number; u: number } {
  switch (tipo) {
    case 'nenhum': return { f: 1, u: 0 }
    case 'M2': return { f: nd.fM2, u: nd.uM2 }
    case 'O1': return { f: nd.fO1, u: nd.uO1 }
    case 'K1': return { f: nd.fK1, u: nd.uK1 }
    case 'K2': return { f: nd.fK2, u: nd.uK2 }
    case 'M2x2': return { f: nd.fM2 ** 2, u: 2 * nd.uM2 }
    case 'M2x3': return { f: nd.fM2 ** 3, u: 3 * nd.uM2 }
    case 'M2x4': return { f: nd.fM2 ** 4, u: 4 * nd.uM2 }
    case 'M2K1': return { f: nd.fM2 * nd.fK1, u: nd.uM2 + nd.uK1 }
    case 'M2O1': return { f: nd.fM2 * nd.fO1, u: nd.uM2 + nd.uO1 }
    case 'M2K2': return { f: nd.fM2 * nd.fK2, u: nd.uM2 + nd.uK2 }
    case 'M2x2K2': return { f: nd.fM2 ** 2 * nd.fK2, u: 2 * nd.uM2 + nd.uK2 }
  }
}

/**
 * Altura da maré num instante (ms UTC) para uma estação.
 * As fases G publicadas são de Greenwich; o τ usa hora UTC — nada de fuso
 * aqui dentro. A conversão para hora local acontece só na exibição.
 */
export function alturaMareAstro(
  msUTC: number,
  constantes: ConstantesEstacao,
  nivelMedio: number,
): number {
  const t0 = Date.UTC(new Date(msUTC).getUTCFullYear(), 0, 1) // meia-noite de 1º/jan (UTC)
  const { s, h, p, N } = longitudesMedias(t0)
  const nd = nodais(N)
  const horasNoAno = (msUTC - t0) / 3600000
  const tau0 = -s + h // τ em t0 (15·t = 0)

  let alt = nivelMedio
  for (const [nome, c] of Object.entries(constantes)) {
    const def = CATALOGO[nome]
    if (!def || c.amp <= 0) continue
    const [nTau, nS, nH, nP, extra] = def.v
    const v0 = nTau * tau0 + nS * s + nH * h + nP * p + extra
    const { f, u } = fuDe(def.nodal, nd)
    const fase = (def.sigma * horasNoAno + v0 + u - c.gDeg) * RAD
    alt += f * c.amp * Math.cos(fase)
  }
  return alt
}

/** Curva do dia (hora local do aparelho) em passos de `passoH` horas. */
export function curvaDiaAstro(
  data: Date,
  constantes: ConstantesEstacao,
  nivelMedio: number,
  passoH = 0.25,
): { hora: number; alturaM: number }[] {
  const meiaNoiteLocal = new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime()
  const pts: { hora: number; alturaM: number }[] = []
  for (let hLocal = 0; hLocal <= 24 + 1e-9; hLocal += passoH) {
    const ms = meiaNoiteLocal + hLocal * 3600000
    pts.push({
      hora: Number(hLocal.toFixed(2)),
      alturaM: Number(alturaMareAstro(ms, constantes, nivelMedio).toFixed(3)),
    })
  }
  return pts
}
