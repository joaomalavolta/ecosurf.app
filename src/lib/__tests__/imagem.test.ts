import { describe, it, expect } from 'vitest'
import { codificar, extensaoDe, nomeComExtensao, arquivoDe } from '../imagem'

/**
 * O silêncio que custava 3,5 MB.
 *
 * `canvas.toBlob(cb, 'image/webp', q)` não avisa quando o navegador não sabe
 * codificar webp: pela especificação ele cai em PNG e segue. O app pedia webp
 * e rotulava o resultado como webp na mão, sem olhar `blob.type` — nos
 * aparelhos sem encoder webp, subia PNG com a etiqueta trocada.
 *
 * Medido em 1600×1200 fotográfico: webp 774 KB, jpeg 747 KB, PNG 4933 KB.
 * Dois registros em produção têm exatamente esse perfil.
 */

/** Canvas de mentira: só precisa de `toBlob`, que é tudo o que `codificar` usa. */
function canvasFalso(suportados: string[]) {
  const pedidos: string[] = []
  const canvas = {
    pedidos,
    toBlob(cb: (b: Blob | null) => void, tipo?: string, _q?: number) {
      pedidos.push(tipo ?? 'image/png')
      // O navegador devolve PNG quando não conhece o tipo pedido — é a regra
      // da especificação, e é justamente o comportamento que escondia o bug.
      const real = suportados.includes(tipo ?? '') ? tipo! : 'image/png'
      // PNG é grande de propósito: é o que denuncia o problema na prática.
      const bytes = real === 'image/png' ? 5_000_000 : 750_000
      cb(new Blob([new Uint8Array(Math.min(bytes, 64))], { type: real }))
    },
  }
  return canvas as unknown as HTMLCanvasElement & { pedidos: string[] }
}

describe('codificar', () => {
  it('devolve webp quando o navegador codifica webp', async () => {
    const c = canvasFalso(['image/webp', 'image/jpeg'])
    const b = await codificar(c, 0.86)
    expect(b.type).toBe('image/webp')
    expect(c.pedidos).toEqual(['image/webp'])   // nem tenta o reserva à toa
  })

  it('cai em JPEG — e NÃO no PNG — quando falta encoder webp', async () => {
    const c = canvasFalso(['image/jpeg'])
    const b = await codificar(c, 0.86)
    expect(b.type).toBe('image/jpeg')
    expect(c.pedidos).toEqual(['image/webp', 'image/jpeg'])
  })

  it('sem webp nem jpeg, entrega o PNG em vez de falhar', async () => {
    // Grande é pior que pequeno, mas melhor que perder o registro.
    const c = canvasFalso([])
    const b = await codificar(c, 0.86)
    expect(b.type).toBe('image/png')
  })

  it('erra alto se o canvas não devolve nada', async () => {
    const c = { toBlob: (cb: (b: Blob | null) => void) => cb(null) } as unknown as HTMLCanvasElement
    await expect(codificar(c, 0.86)).rejects.toThrow(/não foi possível gerar/i)
  })
})

describe('nome e extensão seguem o conteúdo', () => {
  const blob = (tipo: string) => new Blob([new Uint8Array(4)], { type: tipo })

  it('extensão casa com o tipo real', () => {
    expect(extensaoDe(blob('image/webp'))).toBe('webp')
    expect(extensaoDe(blob('image/png'))).toBe('png')
    expect(extensaoDe(blob('image/jpeg'))).toBe('jpg')   // nunca "jpeg"
    expect(extensaoDe(blob(''))).toBe('jpg')             // sem tipo: aposta segura
  })

  it('troca a extensão do nome original, não acumula', () => {
    expect(nomeComExtensao('IMG_2043.HEIC', blob('image/jpeg'))).toBe('IMG_2043.jpg')
    expect(nomeComExtensao('foto.webp', blob('image/png'))).toBe('foto.png')
    expect(nomeComExtensao(undefined, blob('image/webp'))).toBe('foto.webp')
  })

  it('o File não mente sobre o próprio conteúdo', () => {
    // Era exatamente esta mentira: `new File([blob], 'x.webp', {type:'image/webp'})`
    // com bytes de PNG dentro. O storage guardava a etiqueta errada.
    const png = blob('image/png')
    const f = arquivoDe(png, 'alerta-123')
    expect(f.type).toBe('image/png')
    expect(f.name).toBe('alerta-123.png')
  })
})
