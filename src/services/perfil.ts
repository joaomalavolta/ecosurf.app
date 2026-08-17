import { temBackend } from './api'

export interface PerfilStatus {
  sessao: boolean
  onboarded: boolean
  nome?: string
}

/** Estado do usuário: tem sessão? completou o cadastro? */
export async function statusPerfil(): Promise<PerfilStatus> {
  if (!temBackend()) return { sessao: false, onboarded: false }
  try {
    const { sb } = await import('./supabase/client')
    const { data } = await sb().auth.getSession()
    const u = data.session?.user
    if (!u) return { sessao: false, onboarded: false }
    const { data: p } = await sb().from('perfis').select('onboarded,nome').eq('id', u.id).single()
    return { sessao: true, onboarded: !!p?.onboarded, nome: p?.nome ?? undefined }
  } catch {
    return { sessao: false, onboarded: false }
  }
}

export interface PerfilAtual {
  nome: string
  nivel: string
  telefoneValidado: boolean
  avatarUrl?: string
}

/** Perfil do usuário logado (real, do Supabase). Null se não há sessão. */
export async function carregarPerfilAtual(): Promise<PerfilAtual | null> {
  if (!temBackend()) return null
  try {
    const { sb } = await import('./supabase/client')
    const { data } = await sb().auth.getSession()
    const u = data.session?.user
    if (!u) return null
    const { data: p } = await sb()
      .from('perfis')
      .select('nome,nivel,telefone_validado,foto_url')
      .eq('id', u.id)
      .single()
    if (!p) return null
    return {
      nome: p.nome ?? 'Surfista',
      nivel: p.nivel ?? 'novato',
      telefoneValidado: !!p.telefone_validado,
      avatarUrl: p.foto_url ?? undefined,
    }
  } catch {
    return null
  }
}

/** Envia o código de acesso por e-mail (OTP). */
export async function enviarCodigo(email: string): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { error } = await sb().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
  if (error) throw error
}

export async function confirmarCodigo(email: string, token: string): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { error } = await sb().auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' })
  if (error) throw error
}

export interface DadosPerfil {
  nome: string
  cidade: string
  picoPrincipal: string
  fotoBlob?: Blob
}

/** Grava o perfil e marca onboarded. Coleta mínima (LGPD): sem CPF desde 2026-07. */
export async function salvarPerfil(d: DadosPerfil): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u) throw new Error('Sem sessão — confirme o e-mail primeiro.')

  let foto_url: string | undefined
  if (d.fotoBlob) {
    // Pasta do dono: a policy do bucket exige avatars/<uid>/... (só o dono grava ali)
    // Caminho fixo (a URL vai gravada em `perfis.foto_url`): a extensão fica.
    // O contentType segue o blob — ver a nota em services/supabase/api.ts.
    const path = `${u.id}/avatar.webp`
    const up = await sb().storage.from('avatars').upload(path, d.fotoBlob, {
      contentType: d.fotoBlob.type || 'image/webp',
      upsert: true,
    })
    if (!up.error) {
      foto_url = sb().storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
  }

  // upsert (ver definirNome): sem linha em perfis, um UPDATE não erra nem grava.
  const { error } = await sb()
    .from('perfis')
    .upsert({
      id: u.id,
      nome: d.nome.trim(),
      cidade: d.cidade.trim(),
      pico_principal: d.picoPrincipal || null,
      foto_url,
      onboarded: true,
    }, { onConflict: 'id' })
  // Ver definirNome: erro do PostgREST não é Error, e a tela perdia o motivo.
  if (error) throw new Error(error.message || 'Falha ao salvar o perfil.')
}
