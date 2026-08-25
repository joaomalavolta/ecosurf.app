import { describe, it, expect } from 'vitest'
import { tintaSobre } from '../SeletorCategoria'

/** Contraste WCAG entre duas cores hex. */
function contraste(a: string, b: string): number {
  const lum = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16) / 255)
    const c = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(bl)
  }
  const [l1, l2] = [lum(a), lum(b)]
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

/** As 17 cores de categoria de SeletorCategoria. */
const PALETA = [
  '#0E9AA7', '#15803D', '#2E9B6B', '#3D3D3D', '#5B8C5A', '#5E8C61',
  '#6B7280', '#7AA93C', '#7B8794', '#8B6914', '#9B6B4D', '#B266B2',
  '#C17817', '#D64045', '#E0A82E', '#E84855', '#FF6B35',
]

describe('tintaSobre', () => {
  it('cor escura pede tinta branca; cor clara pede tinta escura', () => {
    expect(tintaSobre('#15803D')).toBe('#FFFFFF') // verde da vegetação
    expect(tintaSobre('#E0A82E')).toBe('#0B1620') // amarelo, o caso que falhava
  })

  it('TODA a paleta passa em 3.0 — o mínimo para objeto gráfico', () => {
    // Era 2.14 no pior caso, com '#fff' fixo. Este teste é a guarda para
    // quando alguém acrescentar a 18ª categoria com uma cor clara.
    for (const cor of PALETA) {
      expect(contraste(tintaSobre(cor), cor)).toBeGreaterThanOrEqual(3)
    }
  })

  it('a escolha é sempre a melhor das duas, nunca a pior', () => {
    for (const cor of PALETA) {
      const escolhida = contraste(tintaSobre(cor), cor)
      const outra = contraste(tintaSobre(cor) === '#FFFFFF' ? '#0B1620' : '#FFFFFF', cor)
      expect(escolhida).toBeGreaterThanOrEqual(outra)
    }
  })
})
