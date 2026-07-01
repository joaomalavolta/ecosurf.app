import { sb } from './client'
import type { EcosurfApi, NovaFoto } from '../api'

/**
 * Exige usuário IDENTIFICADO (não anônimo). Sem contribuição anônima:
 * se não houver sessão real, falha — a UI deve pedir login (telefone/e-mail).
 */
async function usuarioAtual(): Promise<string> {
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u || u.is_anonymous) {
    throw new Error('Entre com seu telefone ou e-mail para publicar.')
  }
  return u.id
}

/** Implementação real do contrato. Procedência/geofence são decididos no servidor. */
export const supabaseApi: EcosurfApi = {
  async enviarFoto(f: NovaFoto) {
    const autorId = await usuarioAtual()
    const path = `${f.picoId}/${f.id}.webp`
    if (f.blob) {
      const up = await sb().storage.from('fotos').upload(path, f.blob, {
        contentType: 'image/webp',
        upsert: false,
      })
      if (up.error) throw up.error
    }
    const { error } = await sb()
      .from('fotos')
      .insert({
        id: f.id,
        pico_id: f.picoId,
        autor_id: autorId,
        capturada_em: f.capturadaEm,
        storage_path: f.blob ? path : null,
        observacao: f.observacao,
        captura_lat: f.capturaLat ?? null,
        captura_lng: f.capturaLng ?? null,
        // status, procedencia e geofence_ok são definidos por triggers no servidor
      })
    if (error) throw error
    return { id: f.id }
  },
}
