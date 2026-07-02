import { describe, it, expect } from 'vitest'
import { alturaMare, curvaMareDia, faseMare, rotuloFase, CONSTITUINTES_PADRAO, type Constituinte } from '../tide'

/** Constituinte de laboratório: cosseno puro, período 12h, amplitude 1, fase 0.
 *  h(t) = 0.7 + cos(2πt/12) → máx 1.7 em t=0/12/24, mín -0.3 em t=6/18. */
const LAB: Constituinte[] = [{ nome: 'LAB', periodoH: 12, amp: 1, faseDeg: 0 }]

describe('alturaMare', () => {
  it('reproduz o cosseno analítico com constituinte de laboratório', () => {
    expect(alturaMare(0, LAB)).toBeCloseTo(1.78, 10)
    expect(alturaMare(6, LAB)).toBeCloseTo(-0.22, 10)
    expect(alturaMare(3, LAB)).toBeCloseTo(0.78, 10) // quarto de período: cos(π/2)=0
    expect(alturaMare(12, LAB)).toBeCloseTo(1.78, 10)
  })

  it('aplica a fase em graus (90° desloca o pico em -T/4)', () => {
    const fase90: Constituinte[] = [{ nome: 'F', periodoH: 12, amp: 1, faseDeg: 90 }]
    // cos(2πt/12 - π/2) tem pico em t=3
    expect(alturaMare(3, fase90)).toBeCloseTo(1.78, 10)
    expect(alturaMare(0, fase90)).toBeCloseTo(0.78, 10)
  })

  it('é periódica no período da constituinte', () => {
    for (const t of [0.7, 5.3, 11.9]) {
      expect(alturaMare(t + 12, LAB)).toBeCloseTo(alturaMare(t, LAB), 10)
    }
  })

  it('fica sempre dentro do envelope físico (nível médio ± soma das amplitudes)', () => {
    const NM = 0.78
    const somaAmp = CONSTITUINTES_PADRAO.reduce((s, c) => s + c.amp, 0)
    for (let t = 0; t <= 48; t += 0.1) {
      const h = alturaMare(t)
      expect(h).toBeGreaterThanOrEqual(NM - somaAmp - 1e-9)
      expect(h).toBeLessThanOrEqual(NM + somaAmp + 1e-9)
    }
  })

  it('com as constantes padrão gera maré mista com variação real (não achatada)', () => {
    const alturas = curvaMareDia(0.25).map((p) => p.alturaM)
    const amplitude = Math.max(...alturas) - Math.min(...alturas)
    expect(amplitude).toBeGreaterThan(0.5) // litoral SE tem ~0.5–1.5 m de range
    expect(amplitude).toBeLessThan(2)
  })
})

describe('curvaMareDia', () => {
  it('gera 97 pontos de 0h a 24h com passo padrão de 15 min', () => {
    const pts = curvaMareDia()
    expect(pts).toHaveLength(97)
    expect(pts[0].hora).toBe(0)
    expect(pts[96].hora).toBe(24)
  })

  it('respeita passo customizado e mantém horas crescentes', () => {
    const pts = curvaMareDia(1)
    expect(pts).toHaveLength(25)
    for (let i = 1; i < pts.length; i++) expect(pts[i].hora).toBeGreaterThan(pts[i - 1].hora)
  })

  it('arredonda altura a 3 casas (contrato do TideScrubTimeline)', () => {
    for (const p of curvaMareDia(2)) {
      expect(p.alturaM).toBe(Number(p.alturaM.toFixed(3)))
    }
  })
})

describe('faseMare', () => {
  it('identifica cheia, seca, vazante e enchente no cosseno de laboratório', () => {
    expect(faseMare(0, LAB)).toBe('cheia')     // pico
    expect(faseMare(6, LAB)).toBe('seca')      // vale
    expect(faseMare(3, LAB)).toBe('vazante')   // descendo (0→6)
    expect(faseMare(9, LAB)).toBe('enchente')  // subindo (6→12)
  })

  it('nas constantes padrão, todas as fases ocorrem ao longo de 24h', () => {
    const fases = new Set<string>()
    for (let t = 0; t <= 24; t += 0.25) fases.add(faseMare(t))
    expect(fases).toEqual(new Set(['cheia', 'seca', 'vazante', 'enchente']))
  })
})

describe('rotuloFase', () => {
  it('traduz cada fase para o rótulo em português', () => {
    expect(rotuloFase('enchente')).toBe('maré enchendo')
    expect(rotuloFase('vazante')).toBe('maré vazando')
    expect(rotuloFase('cheia')).toBe('maré cheia')
    expect(rotuloFase('seca')).toBe('maré seca')
  })
})
