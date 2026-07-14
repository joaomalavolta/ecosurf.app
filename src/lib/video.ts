/**
 * Vídeo de até 5 segundos como registro do mar.
 *
 * Princípios:
 *  - COMPRESSÃO NA ORIGEM: o MediaRecorder grava já com bitrate limitado
 *    (~2,5 Mbps → 5 s ≈ 1,5 MB). Nada de re-encode no navegador.
 *  - MP4 PRIMEIRO: cascata de codecs prioriza H.264/MP4 (toca em tudo);
 *    webm é o fallback onde o navegador não grava mp4.
 *  - GALERIA COM PORTEIRO: só entra o que já chega dentro das regras
 *    (≤ 5 s, ≤ 12 MB, formato legível). Cortar/transcodificar no cliente
 *    exigiria ffmpeg.wasm — caro demais; o corte se faz no editor do celular.
 */

export const VIDEO_MAX_S = 5
export const VIDEO_MAX_GALERIA_S = 5.4 // tolerância p/ arredondamento de players
export const VIDEO_MAX_GALERIA_BYTES = 12 * 1024 * 1024

const CASCATA_MIME = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp8',
  'video/webm',
]

/** Melhor formato que este navegador consegue gravar (mp4 primeiro). */
export function melhorMimeGravacao(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  for (const m of CASCATA_MIME) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m
    } catch { /* implementações antigas lançam em vez de retornar false */ }
  }
  return null
}

export function extensaoDoMime(mime: string): 'mp4' | 'webm' {
  return mime.includes('mp4') ? 'mp4' : 'webm'
}

export interface ClipeGravado {
  blob: Blob
  mime: string
  duracaoS: number
}

export interface GravacaoAtiva {
  /** Encerra a gravação agora (soltar o botão). Resolve com o clipe. */
  parar: () => void
  /** Resolve ao fim (por parar() ou pelo teto de 5 s). */
  clipe: Promise<ClipeGravado>
}

/**
 * Grava um clipe do stream da câmera já aberta, com teto rígido de 5 s.
 * `onProgresso` recebe 0..1 (para o anel do botão).
 */
export function gravarClipe(
  stream: MediaStream,
  onProgresso?: (frac: number) => void,
): GravacaoAtiva | null {
  const mime = melhorMimeGravacao()
  if (!mime) return null
  const rec = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 2_500_000,
  })
  const pedacos: Blob[] = []
  const inicio = Date.now()
  let fim = 0
  let timerProg: ReturnType<typeof setInterval> | undefined
  // Objeto-caixa: permite que limpar() (definida antes) enxergue o timer do
  // teto sem cair no TDZ nem provocar prefer-const.
  const teto: { id?: ReturnType<typeof setTimeout> } = {}

  const clipe = new Promise<ClipeGravado>((resolve, reject) => {
    rec.ondataavailable = (e) => { if (e.data.size > 0) pedacos.push(e.data) }
    rec.onerror = () => {
      limpar()
      reject(new Error('Falha ao gravar o vídeo neste aparelho.'))
    }
    rec.onstop = () => {
      limpar()
      const duracaoS = Math.min(VIDEO_MAX_S, ((fim || Date.now()) - inicio) / 1000)
      resolve({ blob: new Blob(pedacos, { type: mime }), mime, duracaoS })
    }
  })

  function limpar() {
    if (teto.id !== undefined) clearTimeout(teto.id)
    if (timerProg) clearInterval(timerProg)
    onProgresso?.(1)
  }
  function parar() {
    if (rec.state !== 'inactive') {
      fim = Date.now()
      try { rec.stop() } catch { /* já parado */ }
    }
  }

  rec.start(250) // pedaços periódicos: nada se perde se o teto derrubar
  teto.id = setTimeout(parar, VIDEO_MAX_S * 1000)
  if (onProgresso) {
    timerProg = setInterval(
      () => onProgresso(Math.min(1, (Date.now() - inicio) / (VIDEO_MAX_S * 1000))),
      100,
    )
  }
  return { parar, clipe }
}

export interface VeredictoGaleria {
  ok: boolean
  motivo?: string
  duracaoS?: number
  mime?: string
}

/**
 * Porteiro da galeria: aceita só vídeo ≤ 5 s, ≤ 12 MB e que este navegador
 * consiga ao menos ler (metadata carrega). Mensagens em linguagem de gente.
 */
export function validarVideoGaleria(file: File): Promise<VeredictoGaleria> {
  if (!file.type.startsWith('video/')) {
    return Promise.resolve({ ok: false, motivo: 'O arquivo escolhido não é um vídeo.' })
  }
  if (file.size > VIDEO_MAX_GALERIA_BYTES) {
    return Promise.resolve({
      ok: false,
      motivo: 'Vídeo muito pesado. Corte para até 5 segundos no editor da galeria e tente de novo.',
    })
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    const fim = (r: VeredictoGaleria) => {
      URL.revokeObjectURL(url)
      resolve(r)
    }
    v.onloadedmetadata = () => {
      if (!isFinite(v.duration) || v.duration <= 0) {
        fim({ ok: false, motivo: 'Não deu para ler a duração deste vídeo neste aparelho.' })
      } else if (v.duration > VIDEO_MAX_GALERIA_S) {
        fim({
          ok: false,
          motivo: `Este vídeo tem ${Math.round(v.duration)}s. Corte para até 5 segundos na galeria e tente de novo.`,
          duracaoS: v.duration,
        })
      } else {
        fim({ ok: true, duracaoS: v.duration, mime: file.type })
      }
    }
    v.onerror = () =>
      fim({ ok: false, motivo: 'Este formato de vídeo não é suportado neste aparelho.' })
    v.src = url
  })
}

/**
 * Poster (frame) de um ARQUIVO de vídeo: carrega, avança ~0,1 s e captura.
 * Devolve o <video> pronto para o mesmo `versoesDeVideo` usado pela câmera.
 */
export function carregarVideoParaPoster(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('video ilegível')) }
    v.onloadeddata = () => {
      const capturar = () => resolve(v) // caller revoga a URL depois de usar
      if (v.readyState >= 2 && v.videoWidth > 0) {
        v.currentTime = Math.min(0.1, v.duration / 2)
        v.onseeked = capturar
      } else {
        capturar()
      }
    }
    v.src = url
  })
}
