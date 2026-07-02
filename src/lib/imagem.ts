/**
 * Redimensionamento de imagem no cliente (WebP). Gera a versão cheia e a
 * miniatura a partir do mesmo quadro, para o feed carregar leve no 4G da praia
 * sem baixar a foto inteira.
 */

async function paraCanvasBlob(
  fonte: CanvasImageSource,
  larguraFonte: number,
  alturaFonte: number,
  maxDim: number,
  qualidade: number,
): Promise<Blob | undefined> {
  const escala = Math.min(1, maxDim / Math.max(larguraFonte, alturaFonte))
  const w = Math.round(larguraFonte * escala)
  const h = Math.round(alturaFonte * escala)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')?.drawImage(fonte, 0, 0, w, h)
  return new Promise<Blob | undefined>((res) =>
    c.toBlob((b) => res(b ?? undefined), 'image/webp', qualidade),
  )
}

export interface VersoesImagem {
  /** Versão cheia — usada na página do pico e no visor. */
  full?: Blob
  /** Miniatura — usada no feed/listas. */
  thumb?: Blob
}

const MAX_FULL = 1600
const Q_FULL = 0.8
const MAX_THUMB = 400
const Q_THUMB = 0.7

/** Gera cheia + thumb a partir de um quadro de vídeo (câmera). */
export async function versoesDeVideo(v: HTMLVideoElement): Promise<VersoesImagem> {
  if (!v.videoWidth) return {}
  const [full, thumb] = await Promise.all([
    paraCanvasBlob(v, v.videoWidth, v.videoHeight, MAX_FULL, Q_FULL),
    paraCanvasBlob(v, v.videoWidth, v.videoHeight, MAX_THUMB, Q_THUMB),
  ])
  return { full, thumb }
}

/** Gera cheia + thumb a partir de um arquivo/imagem da galeria. */
export async function versoesDeArquivo(file: Blob): Promise<VersoesImagem> {
  const bitmap = await createImageBitmap(file)
  try {
    const [full, thumb] = await Promise.all([
      paraCanvasBlob(bitmap, bitmap.width, bitmap.height, MAX_FULL, Q_FULL),
      paraCanvasBlob(bitmap, bitmap.width, bitmap.height, MAX_THUMB, Q_THUMB),
    ])
    return { full, thumb }
  } finally {
    bitmap.close()
  }
}
