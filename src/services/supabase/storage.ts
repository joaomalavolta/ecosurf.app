import { sb } from './client'

/**
 * URL assinada para um objeto privado do bucket `fotos`. Bucket é privado
 * (LGPD: fotos podem identificar pessoas), então a exibição usa URL temporária.
 */
export async function urlAssinada(path: string, segundos = 3600): Promise<string | undefined> {
  const { data } = await sb().storage.from('fotos').createSignedUrl(path, segundos)
  return data?.signedUrl
}

/**
 * URLs assinadas em LOTE: uma chamada para vários caminhos. Usado em grades
 * (ex.: fotos do perfil), onde assinar uma a uma seria N requisições.
 * Retorna um mapa caminho → URL (ausente se falhar aquele item).
 */
export async function urlsAssinadas(paths: string[], segundos = 3600): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  const limpos = paths.filter(Boolean)
  if (!limpos.length) return mapa
  const { data } = await sb().storage.from('fotos').createSignedUrls(limpos, segundos)
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa.set(item.path, item.signedUrl)
  }
  return mapa
}
