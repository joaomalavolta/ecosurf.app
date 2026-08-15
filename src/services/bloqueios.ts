/**
 * Bloqueio de pessoas.
 *
 * A caixa de entrada é aberta a qualquer um da rede — isto é a saída de quem
 * recebe o que não pediu. Bloqueou: a pessoa não escreve mais, a conversa sai
 * da caixa de entrada e nenhum aviso chega.
 *
 * O bloqueio é SILENCIOSO. Quem foi bloqueado não é avisado e não consegue
 * descobrir: não há consulta no banco que entregue isso (a RLS só devolve os
 * bloqueios que você mesmo criou). Avisar convidaria à retaliação.
 *
 * Quem barra de fato é o banco, num gatilho — o cliente é só a porta.
 */

export interface Bloqueado {
  id: string
  nome: string | null
  fotoUrl: string | null
  criadoEm: string
}

/** Ids que estou bloqueando. Base para esconder conversa e esconder botão. */
export async function idsBloqueados(): Promise<Set<string>> {
  try {
    const { sb } = await import('./supabase/client')
    const { data } = await sb().from('bloqueios').select('bloqueado_id')
    return new Set(((data ?? []) as { bloqueado_id: string }[]).map((b) => b.bloqueado_id))
  } catch {
    return new Set()
  }
}

/** Lista com rosto, para a tela de gerenciar. */
export async function listarBloqueados(): Promise<Bloqueado[]> {
  const { sb } = await import('./supabase/client')
  const { data, error } = await sb()
    .from('bloqueios')
    .select('bloqueado_id, criado_em')
    .order('criado_em', { ascending: false })
  if (error) throw new Error(error.message)
  const linhas = (data ?? []) as { bloqueado_id: string; criado_em: string }[]
  if (linhas.length === 0) return []

  const { data: perfis } = await sb()
    .from('perfis')
    .select('id, nome, foto_url')
    .in('id', linhas.map((l) => l.bloqueado_id))
  const mapa = new Map(((perfis ?? []) as { id: string; nome: string | null; foto_url: string | null }[])
    .map((p) => [p.id, p]))

  return linhas.map((l) => {
    const p = mapa.get(l.bloqueado_id)
    return {
      id: l.bloqueado_id,
      nome: p?.nome ?? null,
      fotoUrl: p?.foto_url ?? null,
      criadoEm: l.criado_em,
    }
  })
}

export async function bloquear(usuarioId: string): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const eu = sessao.session?.user?.id
  if (!eu) throw new Error('Entre na sua conta para bloquear.')
  if (eu === usuarioId) throw new Error('Não dá para bloquear você mesmo.')

  const { error } = await sb()
    .from('bloqueios')
    .upsert({ bloqueador_id: eu, bloqueado_id: usuarioId }, { onConflict: 'bloqueador_id,bloqueado_id' })
  if (error) throw new Error(error.message)
}

export async function desbloquear(usuarioId: string): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const eu = sessao.session?.user?.id
  if (!eu) return
  // O `.select()` não é enfeite: quando a RLS recusa, o DELETE atinge 0 linhas
  // e o PostgREST NÃO devolve erro — a tela diria "desbloqueado" sem ter sido.
  const { data, error } = await sb()
    .from('bloqueios')
    .delete()
    .eq('bloqueador_id', eu)
    .eq('bloqueado_id', usuarioId)
    .select('bloqueado_id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Não foi possível desbloquear agora.')
}
