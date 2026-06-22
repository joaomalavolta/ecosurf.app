import { temBackend } from './api'

/** Denuncia uma foto (usuário identificado). */
export async function denunciarFoto(fotoId: string, motivo = ''): Promise<void> {
  if (!temBackend()) throw new Error('Backend não configurado')
  const { sb } = await import('./supabase/client')
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u || u.is_anonymous) throw new Error('Entre para denunciar.')
  const { error } = await sb().from('denuncias').insert({ foto_id: fotoId, autor_id: u.id, motivo })
  if (error) throw error
}

/** O usuário atual é moderador/admin? */
export async function ehModerador(): Promise<boolean> {
  if (!temBackend()) return false
  const { sb } = await import('./supabase/client')
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u) return false
  const { data: perfil } = await sb().from('perfis').select('papel').eq('id', u.id).single()
  return ['moderator', 'admin', 'super_admin'].includes(perfil?.papel ?? '')
}

export interface DenunciaItem {
  id: string
  foto_id: string
  motivo: string | null
  criada_em: string
}

export async function listarDenuncias(): Promise<DenunciaItem[]> {
  if (!temBackend()) return []
  const { sb } = await import('./supabase/client')
  const { data, error } = await sb()
    .from('denuncias')
    .select('id,foto_id,motivo,criada_em')
    .order('criada_em', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function ocultarFoto(fotoId: string, motivo = 'moderação'): Promise<void> {
  if (!temBackend()) return
  const { sb } = await import('./supabase/client')
  const { error } = await sb().from('fotos').update({ oculta: true, motivo_oculta: motivo }).eq('id', fotoId)
  if (error) throw error
}
