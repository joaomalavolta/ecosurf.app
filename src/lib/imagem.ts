/**
 * Redimensionamento e codificação de imagem no cliente. Gera a versão cheia e
 * a miniatura a partir do mesmo quadro, para o feed carregar leve no 4G da
 * praia sem baixar a foto inteira.
 */

const WEBP = 'image/webp'
const JPEG = 'image/jpeg'

function paraBlob(c: HTMLCanvasElement, tipo: string, qualidade: number): Promise<Blob | null> {
  return new Promise((res) => c.toBlob((b) => res(b), tipo, qualidade))
}

/**
 * Codifica o canvas, conferindo o que o navegador REALMENTE devolveu.
 *
 * ── O silêncio que custava 3,5 MB ─────────────────────────────────────────
 *
 * `canvas.toBlob(cb, 'image/webp', 0.86)` não avisa quando o navegador não
 * sabe codificar webp: pela especificação, ele cai em PNG e segue. Todo este
 * app pedia webp e depois rotulava o resultado como webp na mão — nome
 * `.webp`, `contentType: 'image/webp'` — sem nunca olhar `blob.type`. Nos
 * aparelhos sem encoder webp, o que subia era PNG com etiqueta trocada.
 *
 * Medido em 1600×1200 com conteúdo fotográfico:
 *
 *   webp q=0.86  →   773 KB
 *   jpeg q=0.85  →   718 KB
 *   png          →  4934 KB   ← o que chegava ao storage
 *
 * Dois registros em produção tinham exatamente esse perfil: ~3,5 MB
 * carimbados como `image/webp`. Ninguém percebia porque o navegador fareja o
 * conteúdo e desenha a imagem de qualquer forma — só a conta de bytes, a fila
 * de upload e o 3G da praia sentiam.
 *
 * Agora: pede webp, confere; se não vier webp, tenta JPEG, que todo canvas
 * codifica desde sempre e custa o mesmo que o webp. PNG sobra apenas como
 * último recurso, porque grande é melhor do que nada.
 *
 * Quem chama deve usar `blob.type` — nunca presumir o tipo.
 */
export async function codificar(c: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  const webp = await paraBlob(c, WEBP, qualidade)
  if (webp?.type === WEBP) return webp

  const jpeg = await paraBlob(c, JPEG, qualidade)
  if (jpeg?.type === JPEG) return jpeg

  if (webp) return webp
  throw new Error('Não foi possível gerar a imagem.')
}

/** Extensão que casa com o tipo real do blob (`.webp`, `.jpg`, `.png`). */
export function extensaoDe(blob: Blob): string {
  const sub = (blob.type.split('/')[1] || 'jpg').toLowerCase()
  return sub === 'jpeg' ? 'jpg' : sub
}

/** Troca a extensão de um nome de arquivo pela que casa com o blob. */
export function nomeComExtensao(nome: string | undefined, blob: Blob): string {
  return `${(nome ?? 'foto').replace(/\.[^.]+$/, '')}.${extensaoDe(blob)}`
}

/** Um `File` que não mente sobre o próprio conteúdo. */
export function arquivoDe(blob: Blob, nomeBase?: string): File {
  return new File([blob], nomeComExtensao(nomeBase, blob), { type: blob.type })
}

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
  try {
    return await codificar(c, qualidade)
  } catch {
    return undefined
  }
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
