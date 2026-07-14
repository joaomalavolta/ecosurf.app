import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validarVideoGaleria,
  melhorMimeGravacao,
  extensaoDoMime,
  VIDEO_MAX_GALERIA_BYTES,
} from '../video'

/** File falso: só precisa de type e size para o porteiro decidir. */
function arquivo(type: string, size: number, nome = 'clipe'): File {
  const f = new File([new Uint8Array(1)], nome, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('porteiro da galeria', () => {
  it('recusa arquivo que não é vídeo', async () => {
    const v = await validarVideoGaleria(arquivo('image/jpeg', 1000))
    expect(v.ok).toBe(false)
    expect(v.motivo).toMatch(/não é um vídeo/i)
  })

  it('recusa vídeo acima do teto de peso, sem nem tentar decodificar', async () => {
    const v = await validarVideoGaleria(arquivo('video/mp4', VIDEO_MAX_GALERIA_BYTES + 1))
    expect(v.ok).toBe(false)
    expect(v.motivo).toMatch(/pesado/i)
    // A mensagem tem que ENSINAR a saída, não só barrar.
    expect(v.motivo).toMatch(/5 segundos/i)
  })

  it('aceita vídeo curto e leve', async () => {
    stubVideoElement({ duration: 4.2 })
    const v = await validarVideoGaleria(arquivo('video/mp4', 2_000_000))
    expect(v.ok).toBe(true)
    expect(v.duracaoS).toBeCloseTo(4.2)
  })

  it('recusa vídeo longo e diz quantos segundos tem', async () => {
    stubVideoElement({ duration: 12 })
    const v = await validarVideoGaleria(arquivo('video/mp4', 2_000_000))
    expect(v.ok).toBe(false)
    expect(v.motivo).toMatch(/12s/)
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
function stubVideoElement(cfg: { duration?: number; erro?: boolean }) {
  vi.stubGlobal('document', {
    createElement: () => {
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
