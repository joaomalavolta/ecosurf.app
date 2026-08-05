import { rest, getCurtidas } from './supabase/rest'
import { TEM_BACKEND } from './supabase/config'

/**
 * Curtidas de VÁRIAS fotos num request só.
 *
 * O feed pedia 1 HEAD por foto (50 fotos = 50 requests só para abrir o
 * Radar). Aqui os ids vão de uma vez e a contagem é feita no cliente —
 * fotos sem curtida não voltam da consulta e ficam em 0.
 */
export async function getCurtidasEmLote(fotoIds: string[]): Promise<Record<string, number>> {
  const contagem: Record<string, number> = {}
  for (const id of fotoIds) contagem[id] = 0
  if (!TEM_BACKEND || fotoIds.length === 0) return contagem

  // foto_id é uuid (hex + hífen): seguro na URL sem aspas nem escaping. Ids
  // fora desse formato ficam de fora do lote — contam 0, como já contariam.
  const ids = fotoIds.filter((id) => /^[0-9a-fA-F-]{36}$/.test(id))
  if (ids.length === 0) return contagem

  const TETO = 10000
  try {
    const linhas = await rest<{ foto_id: string }[]>(
      `curtidas?select=foto_id&foto_id=in.(${ids.join(',')})&limit=${TETO}`,
    )
    // Se bateu no teto, a contagem estaria truncada (silenciosamente errada):
    // volta ao caminho por foto, que é exato.
    if (linhas.length >= TETO) {
      const pares = await Promise.all(ids.map(async (id) => [id, await getCurtidas(id)] as const))
      for (const [id, n] of pares) contagem[id] = n
      return contagem
    }
    for (const l of linhas) contagem[l.foto_id] = (contagem[l.foto_id] ?? 0) + 1
    return contagem
  } catch {
    return contagem
  }
}
