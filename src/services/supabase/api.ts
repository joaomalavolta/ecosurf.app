import { sb } from './client'
import type { EcosurfApi, NovaFoto } from '../api'

/**
 * Implementação real do contrato sobre Supabase (Storage + Postgres/PostGIS).
 * ⚠️ Dormente: só roda com VITE_SUPABASE_URL setada; precisa de projeto
 * provisionado para ser verificada de ponta a ponta.
 */
export const supabaseApi: EcosurfApi = {
  async enviarFoto(f: NovaFoto) {
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
        capturada_em: f.capturadaEm,
        storage_path: f.blob ? path : null,
        procedencia: f.procedencia,
        geofence_ok: f.geofenceOk,
        observacao: f.observacao,
      })
    if (error) throw error
    return { id: f.id }
  },
}
