import { sb } from './client'

/**
 * URL assinada para um objeto privado do bucket `fotos`. Bucket é privado
 * (LGPD: fotos podem identificar pessoas), então a exibição usa URL temporária.
 */
export async function urlAssinada(path: string, segundos = 3600): Promise<string | undefined> {
  const { data } = await sb().storage.from('fotos').createSignedUrl(path, segundos)
  return data?.signedUrl
}
