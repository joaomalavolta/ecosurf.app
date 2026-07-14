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
  /** Poster (frame) capturado direto do canvas do corte — evita reler o blob. */
  posterBlob?: Blob
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

/** Teto de peso do ARQUIVO de origem que aceitamos abrir para recortar. */
export const VIDEO_MAX_ORIGEM_BYTES = 200 * 1024 * 1024
/** Lado maior do clipe recortado — 720p basta para o mar e segura o peso. */
const LARGURA_ALVO = 1280

/** Este aparelho consegue recortar/reprocessar vídeo no próprio navegador? */
export function podeRecortarNoAparelho(): boolean {
  if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') return false
  if (!melhorMimeGravacao()) return false
  const c = document.createElement('canvas')
  return typeof (c as HTMLCanvasElement & { captureStream?: unknown }).captureStream === 'function'
}

/**
 * Recorta os primeiros 5 s de um vídeo da galeria e RE-CODIFICA no aparelho.
 *
 * Como: reproduz o arquivo, desenha cada quadro num canvas e grava o
 * `captureStream()` desse canvas com o mesmo MediaRecorder da câmera. Resolve
 * três problemas de uma vez:
 *   · duração — para no teto de 5 s;
 *   · formato — a saída sai no codec que ESTE navegador grava (mata o HEVC do
 *     iPhone, que muitos Androids não reproduzem);
 *   · peso — reescala para 720p e limita o bitrate (≈1,5 MB, como o in-app).
 *
 * Custo honesto: leva alguns segundos (roda em tempo real) e descarta o áudio
 * — o feed reproduz mudo de qualquer forma.
 */
export function recortarVideoParaClipe(
  file: File,
  opts?: { inicioS?: number; onProgresso?: (frac: number) => void },
): Promise<ClipeGravado> {
  const inicioS = Math.max(0, opts?.inicioS ?? 0)
  const onProgresso = opts?.onProgresso
  return new Promise((resolve, reject) => {
    const mime = melhorMimeGravacao()
    if (!mime || !podeRecortarNoAparelho()) {
      reject(new Error('Este aparelho não consegue recortar vídeo pelo navegador.'))
      return
    }
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.preload = 'auto'
    v.src = url

    let rec: MediaRecorder | null = null
    let raf = 0
    let encerrado = false

    const falhar = (msg: string) => {
      if (encerrado) return
      encerrado = true
      cancelAnimationFrame(raf)
      try { rec?.stop() } catch { /* já parado */ }
      URL.revokeObjectURL(url)
      reject(new Error(msg))
    }

    v.onerror = () => falhar('Não foi possível ler este vídeo neste aparelho.')

    v.onloadeddata = () => {
      if (!v.videoWidth || !v.videoHeight) {
        falhar('Vídeo sem imagem legível.')
        return
      }
      // Reescala mantendo proporção; dimensões pares (exigência de codecs).
      const escala = Math.min(1, LARGURA_ALVO / Math.max(v.videoWidth, v.videoHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round((v.videoWidth * escala) / 2) * 2
      canvas.height = Math.round((v.videoHeight * escala) / 2) * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        falhar('Canvas indisponível neste aparelho.')
        return
      }

      const stream = canvas.captureStream(30)
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 })
      const pedacos: Blob[] = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) pedacos.push(e.data) }
      rec.onerror = () => falhar('Falha ao processar o vídeo.')
      rec.onstop = () => {
        if (encerrado) return
        encerrado = true
        cancelAnimationFrame(raf)
        URL.revokeObjectURL(url)
        onProgresso?.(1)
        const duracaoS = Math.min(VIDEO_MAX_S, Math.max(0.1, (v.duration || VIDEO_MAX_S) - inicioS))
        // Poster do PRÓPRIO canvas (último frame desenhado) — dispensa reler o
        // blob recém-gravado, que costuma vir sem metadados de duração.
        canvas.toBlob(
          (posterBlob) => resolve({ blob: new Blob(pedacos, { type: mime }), mime, duracaoS, posterBlob: posterBlob ?? undefined }),
          'image/jpeg',
          0.82,
        )
      }

      const parar = () => {
        v.pause()
        if (rec && rec.state !== 'inactive') {
          try { rec.stop() } catch { /* corrida com onended */ }
        }
      }

      const fimS = Math.min(v.duration || inicioS + VIDEO_MAX_S, inicioS + VIDEO_MAX_S)

      const desenhar = () => {
        if (encerrado) return
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
        onProgresso?.(Math.min(1, Math.max(0, (v.currentTime - inicioS) / (fimS - inicioS || 1))))
        if (v.currentTime >= fimS || v.ended) {
          parar()
          return
        }
        raf = requestAnimationFrame(desenhar)
      }

      v.onended = parar
      // Posiciona no início do trecho ESCOLHIDO antes de começar a gravar —
      // o recorte é o que o autor selecionou, não os 5 primeiros segundos.
      const comecar = () => {
        rec?.start(250)
        void v.play()
          .then(() => { raf = requestAnimationFrame(desenhar) })
          .catch(() => falhar('Não foi possível reproduzir este vídeo para recortar.'))
      }
      if (inicioS > 0) {
        v.onseeked = () => { v.onseeked = null; comecar() }
        v.currentTime = inicioS
      } else {
        v.currentTime = 0
        comecar()
      }
    }
  })
}

export interface VeredictoGaleria {
  ok: boolean
  /** 'direto' = já está pronto; 'recortar' = precisa passar pelo re-encode. */
  acao?: 'direto' | 'recortar'
  motivo?: string
  duracaoS?: number
  mime?: string
}

/**
 * Triagem da galeria. Três desfechos:
 *  · DIRETO — já está dentro das regras (≤5 s, ≤12 MB): sobe como está,
 *    preservando a qualidade original. Nada de re-encode à toa.
 *  · RECORTAR — longo/pesado, mas o aparelho sabe recortar: vai para o
 *    re-encode (corta em 5 s, normaliza formato, reduz peso).
 *  · RECUSADO — o aparelho não sabe recortar, ou nem ler o arquivo consegue.
 *    A mensagem então ENSINA a saída (cortar no editor do celular).
 */
export function validarVideoGaleria(file: File): Promise<VeredictoGaleria> {
  if (!file.type.startsWith('video/')) {
    return Promise.resolve({ ok: false, motivo: 'O arquivo escolhido não é um vídeo.' })
  }
  if (file.size > VIDEO_MAX_ORIGEM_BYTES) {
    return Promise.resolve({
      ok: false,
      motivo: 'Vídeo grande demais para abrir. Corte um trecho no editor da galeria e tente de novo.',
    })
  }
  const recorta = podeRecortarNoAparelho()
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
      const dur = v.duration
      if (!isFinite(dur) || dur <= 0) {
        fim({ ok: false, motivo: 'Não deu para ler a duração deste vídeo neste aparelho.' })
        return
      }
      const dentroDoTeto = dur <= VIDEO_MAX_GALERIA_S && file.size <= VIDEO_MAX_GALERIA_BYTES
      if (dentroDoTeto) {
        fim({ ok: true, acao: 'direto', duracaoS: dur, mime: file.type })
      } else if (recorta) {
        fim({ ok: true, acao: 'recortar', duracaoS: Math.min(VIDEO_MAX_S, dur), mime: file.type })
      } else {
        fim({
          ok: false,
          motivo: `Este vídeo tem ${Math.round(dur)}s. Corte para até 5 segundos na galeria e tente de novo.`,
          duracaoS: dur,
        })
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

    let resolvido = false
    const terminar = (ok: boolean) => {
      if (resolvido) return
      resolvido = true
      clearTimeout(timeout)
      if (ok) resolve(v)
      else { URL.revokeObjectURL(url); reject(new Error('video ilegível')) }
    }

    // Rede de segurança: blobs frescos do MediaRecorder às vezes não emitem
    // 'seeked' (duração ausente nos metadados). Sem este timeout, o await
    // travava para sempre e o registro "sumia". Ao estourar, usa o frame atual.
    const timeout = setTimeout(() => {
      if (v.videoWidth > 0) terminar(true)
      else terminar(false)
    }, 2500)

    v.onerror = () => terminar(false)
    v.onloadeddata = () => {
      if (!v.videoWidth) { terminar(true); return } // sem imagem: caller lida
      // duration pode ser Infinity/NaN em blob de MediaRecorder: NÃO fazer seek
      // com valor inválido (currentTime = NaN nunca dispara 'seeked').
      const dur = v.duration
      const alvo = Number.isFinite(dur) && dur > 0 ? Math.min(0.1, dur / 2) : 0
      if (alvo > 0) {
        v.onseeked = () => terminar(true)
        try { v.currentTime = alvo } catch { terminar(true) }
      } else {
        terminar(true) // frame inicial já serve de poster
      }
    }
    v.src = url
  })
}
