import { sb } from './client'
import type { EcosurfApi, NovaFoto } from '../api'

/**
 * Garante uma sessão para carimbar autor_id (a RLS exige auth.uid() = autor_id).
 * Sem sessão, entra anônimo — requer o provider "Anonymous" ligado no painel.
 * Se não estiver ligado, o upload falha e a fila offline retém para retry.
 */
async function garantirUsuario(): Promise<string> {
  const { data: s } = await sb().auth.getSession()
  if (s.session?.user) return s.session.user.id
  const { data, error } = await sb().auth.signInAnonymously()
  if (error || !data.user) throw error ?? new Error('sem sessão')
  return data.user.id
}

/** Implementação real do contrato sobre Supabase (Auth + Storage + Postgres). */
export const supabaseApi: EcosurfApi = {
  async enviarFoto(f: NovaFoto) {
    const autorId = await garantirUsuario()
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
        procedencia: f.procedencia,
        geofence_ok: f.geofenceOk,
        observacao: f.observacao,
      })
    if (error) throw error
    return { id: f.id }
  },
}
