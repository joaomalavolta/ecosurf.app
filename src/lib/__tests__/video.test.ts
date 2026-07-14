import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validarVideoGaleria,
  melhorMimeGravacao,
  extensaoDoMime,
  VIDEO_MAX_GALERIA_BYTES,
  VIDEO_MAX_ORIGEM_BYTES,
} from '../video'

/** File falso: só precisa de type e size para o porteiro decidir. */
function arquivo(type: string, size: number, nome = 'clipe'): File {
  const f = new File([new Uint8Array(1)], nome, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('triagem da galeria', () => {
  it('recusa arquivo que não é vídeo', async () => {
    const v = await validarVideoGaleria(arquivo('image/jpeg', 1000))
    expect(v.ok).toBe(false)
    expect(v.motivo).toMatch(/não é um vídeo/i)
  })

  it('recusa arquivo grande demais até para abrir, sem tentar decodificar', async () => {
    const v = await validarVideoGaleria(arquivo('video/mp4', VIDEO_MAX_ORIGEM_BYTES + 1))
    expect(v.ok).toBe(false)
    expect(v.motivo).toMatch(/grande demais/i)
  })

  it('passa DIRETO o vídeo que já está pronto (≤5s, leve) — sem re-encode à toa', async () => {
    stubVideoElement({ duration: 4.2 })
    const v = await validarVideoGaleria(arquivo('video/mp4', 2_000_000))
    expect(v.ok).toBe(true)
    expect(v.acao).toBe('direto')
    expect(v.duracaoS).toBeCloseTo(4.2)
  })

  it('manda RECORTAR o vídeo longo quando o aparelho sabe recortar', async () => {
    stubVideoElement({ duration: 42, podeRecortar: true })
    const v = await validarVideoGaleria(arquivo('video/mp4', 30_000_000))
    expect(v.ok).toBe(true)
    expect(v.acao).toBe('recortar')
    // A duração prometida é a do CLIPE final, não a do arquivo de origem.
    expect(v.duracaoS).toBe(5)
  })

  it('manda RECORTAR o vídeo pesado mesmo que curto (iPhone 4K de 5s)', async () => {
    stubVideoElement({ duration: 4.8, podeRecortar: true })
    const v = await validarVideoGaleria(arquivo('video/quicktime', VIDEO_MAX_GALERIA_BYTES + 1))
    expect(v.ok).toBe(true)
    expect(v.acao).toBe('recortar')
  })

  it('sem suporte a recorte, o longo é recusado ENSINANDO a saída', async () => {
    stubVideoElement({ duration: 12, podeRecortar: false })
    const v = await validarVideoGaleria(arquivo('video/mp4', 2_000_000))
    expect(v.ok).toBe(false)
    expect(v.motivo).toMatch(/12s/)
    expect(v.motivo).toMatch(/5 segundos/i)
  })

  it('recusa formato ilegível neste aparelho (ex.: HEVC em navegador sem suporte)', async () => {
    stubVideoElement({ erro: true })
    const v = await validarVideoGaleria(arquivo('video/quicktime', 2_000_000))
    expect(v.ok).toBe(false)
    expect(v.motivo).toMatch(/não é suportado/i)
  })
})

describe('cascata de codecs', () => {
  it('prefere mp4 quando o aparelho grava mp4 (toca em todo lugar)', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (m: string) => m.includes('mp4') })
    expect(melhorMimeGravacao()).toMatch(/mp4/)
  })

  it('cai para webm quando mp4 não está disponível', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (m: string) => m.includes('webm') })
    expect(melhorMimeGravacao()).toMatch(/webm/)
  })

  it('devolve null quando o aparelho não grava nada (o app segue só com foto)', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => false })
    expect(melhorMimeGravacao()).toBeNull()
  })

  it('extensão segue o mime', () => {
    expect(extensaoDoMime('video/mp4;codecs=avc1')).toBe('mp4')
    expect(extensaoDoMime('video/webm;codecs=vp8')).toBe('webm')
  })
})

/**
 * Ambiente de teste é node (sem DOM) — stubamos apenas o que o porteiro usa:
 * document.createElement('video') e o ciclo de metadata. Sem jsdom: o pacote
 * inteiro não se justifica para dois elementos.
 */
function stubVideoElement(cfg: { duration?: number; erro?: boolean; podeRecortar?: boolean }) {
  // podeRecortarNoAparelho() exige canvas.captureStream + MediaRecorder.
  if (cfg.podeRecortar) {
    vi.stubGlobal('HTMLCanvasElement', class {})
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (m: string) => m.includes('mp4') })
  } else {
    vi.stubGlobal('HTMLCanvasElement', class {})
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => false })
  }
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag === 'canvas') {
        return cfg.podeRecortar ? { captureStream: () => ({}) } : {}
      }
      const el: Record<string, unknown> = { preload: '', muted: false }
      Object.defineProperty(el, 'src', {
        set() {
          setTimeout(() => {
            if (cfg.erro) (el.onerror as (() => void) | undefined)?.()
            else {
              el.duration = cfg.duration
              ;(el.onloadedmetadata as (() => void) | undefined)?.()
            }
          }, 0)
        },
      })
      return el
    },
  })
}

beforeEach(() => {
  vi.unstubAllGlobals()
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
})

describe('carregarVideoParaPoster — blobs frescos do MediaRecorder', () => {
  // O bug: blob recém-gravado tem duration Infinity/NaN. Fazer seek com
  // currentTime=NaN nunca dispara 'seeked' → a Promise travava e o vídeo
  // "sumia". A correção: não fazer seek com duração inválida.
  function stubComDuracao(duration: number) {
    vi.stubGlobal('URL', { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
    let seekTentado = false
    vi.stubGlobal('document', {
      createElement: () => {
        const el: Record<string, unknown> = { videoWidth: 640, videoHeight: 480 }
        Object.defineProperty(el, 'currentTime', {
          get: () => 0,
          set: () => { seekTentado = true }, // se chamado com NaN, seeked nunca vem
        })
        Object.defineProperty(el, 'src', {
          set() {
            setTimeout(() => {
              el.duration = duration
              ;(el.onloadeddata as (() => void) | undefined)?.()
            }, 0)
          },
        })
        return el
      },
    })
    return () => seekTentado
  }

  it('resolve mesmo com duration = Infinity (não trava no seek)', async () => {
    const { carregarVideoParaPoster } = await import('../video')
    stubComDuracao(Infinity)
    const el = await carregarVideoParaPoster(new File([new Uint8Array(1)], 'c', { type: 'video/webm' }))
    expect(el).toBeTruthy()
  })

  it('resolve mesmo com duration = NaN', async () => {
    const { carregarVideoParaPoster } = await import('../video')
    stubComDuracao(NaN)
    const el = await carregarVideoParaPoster(new File([new Uint8Array(1)], 'c', { type: 'video/webm' }))
    expect(el).toBeTruthy()
  })
})
