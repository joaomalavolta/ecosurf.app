/**
 * Comunidades Ecosurf — complemento de funcionalidade do usuário.
 *
 * Qualquer pessoa cria uma comunidade (coletivo, projeto, praia, tema),
 * convida seguidores pelo link e pode promover membros a co-autores, que
 * publicam em nome dela. Sem verificação institucional, sem planos: a
 * comunidade cresce orgânica, no ritmo de quem a fundou.
 *
 * Papéis: admin (gerencia e publica) · autor (publica) · seguidor (acompanha).
 */

export type CategoriaComunidade =
  | 'territorial' | 'ambiental' | 'projeto' | 'escola' | 'coletivo' | 'outro'

export type PapelComunidade = 'admin' | 'autor' | 'seguidor'

export interface Comunidade {
  id: string
  nome: string
  descricao?: string
  categoria: CategoriaComunidade
  municipio?: string
  uf?: string
  avatarUrl?: string
  capaUrl?: string
  criadorId: string
  criadaEm: string
  membros: number
}

export interface DadosComunidade {
  nome: string
  descricao?: string
  categoria: CategoriaComunidade
  municipio?: string
  uf?: string
  avatarBlob?: Blob
  capaBlob?: Blob
}

interface LinhaComunidade {
  id: string
  nome: string
  descricao: string | null
  categoria: string
  municipio: string | null
  uf: string | null
  avatar_url: string | null
  capa_url: string | null
  criador_id: string
  criada_em: string
  membros: number
}

const paraComunidade = (r: LinhaComunidade): Comunidade => ({
  id: r.id,
  nome: r.nome,
  descricao: r.descricao ?? undefined,
  categoria: r.categoria as CategoriaComunidade,
  municipio: r.municipio ?? undefined,
  uf: r.uf ?? undefined,
  avatarUrl: r.avatar_url ?? undefined,
  capaUrl: r.capa_url ?? undefined,
  criadorId: r.criador_id,
  criadaEm: r.criada_em,
  membros: Number(r.membros ?? 0),
})

/** Sobe avatar/capa no bucket próprio, organizados por comunidade. */
async function subirImagem(comunidadeId: string, tipo: 'avatar' | 'capa', blob: Blob): Promise<string | undefined> {
  const { sb } = await import('./supabase/client')
  const path = `${comunidadeId}/${tipo}.webp`
  const up = await sb().storage.from('comunidades').upload(path, blob, {
    contentType: 'image/webp',
    upsert: true,
  })
  if (up.error) return undefined
  // cache-buster: a URL é estável, então o timestamp força o refresh visual
  return `${sb().storage.from('comunidades').getPublicUrl(path).data.publicUrl}?t=${Date.now()}`
}

export async function criarComunidade(d: DadosComunidade): Promise<string> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const uid = sessao.session?.user?.id
  if (!uid) throw new Error('Entre na sua conta para criar uma comunidade.')

  const { data, error } = await sb()
    .from('comunidades')
    .insert({
      nome: d.nome.trim(),
      descricao: d.descricao?.trim() || null,
      categoria: d.categoria,
      municipio: d.municipio?.trim() || null,
      uf: d.uf?.trim() || null,
      criador_id: uid,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Não foi possível criar a comunidade.')

  const id = (data as { id: string }).id

  // Imagens sobem depois: precisam do id da comunidade como pasta.
  const avatar_url = d.avatarBlob ? await subirImagem(id, 'avatar', d.avatarBlob) : undefined
  const capa_url = d.capaBlob ? await subirImagem(id, 'capa', d.capaBlob) : undefined
  if (avatar_url || capa_url) {
    await sb().from('comunidades').update({ avatar_url, capa_url }).eq('id', id)
  }
  return id
}

export async function atualizarComunidade(id: string, d: Partial<DadosComunidade>): Promise<void> {
  const { sb } = await import('./supabase/client')
  const patch: Record<string, unknown> = {}
  if (d.nome !== undefined) patch.nome = d.nome.trim()
  if (d.descricao !== undefined) patch.descricao = d.descricao.trim() || null
  if (d.categoria !== undefined) patch.categoria = d.categoria
  if (d.municipio !== undefined) patch.municipio = d.municipio.trim() || null
  if (d.uf !== undefined) patch.uf = d.uf.trim() || null
  if (d.avatarBlob) patch.avatar_url = await subirImagem(id, 'avatar', d.avatarBlob)
  if (d.capaBlob) patch.capa_url = await subirImagem(id, 'capa', d.capaBlob)

  const { error } = await sb().from('comunidades').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function carregarComunidade(id: string): Promise<Comunidade | null> {
  const { sb } = await import('./supabase/client')
  const { data } = await sb().from('comunidades_publicas').select('*').eq('id', id).maybeSingle()
  return data ? paraComunidade(data as LinhaComunidade) : null
}

export async function listarComunidades(): Promise<Comunidade[]> {
  const { sb } = await import('./supabase/client')
  const { data } = await sb()
    .from('comunidades_publicas')
    .select('*')
    .order('membros', { ascending: false })
    .limit(60)
  return ((data ?? []) as LinhaComunidade[]).map(paraComunidade)
}

/** Comunidades das quais o usuário participa (qualquer papel). */
export async function minhasComunidades(): Promise<{ comunidade: Comunidade; papel: PapelComunidade }[]> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const uid = sessao.session?.user?.id
  if (!uid) return []

  const { data } = await sb()
    .from('membros_comunidade')
    .select('papel, comunidade_id')
    .eq('usuario_id', uid)
  const linhas = (data ?? []) as { papel: PapelComunidade; comunidade_id: string }[]
  if (linhas.length === 0) return []

  const { data: cs } = await sb()
    .from('comunidades_publicas')
    .select('*')
    .in('id', linhas.map((l) => l.comunidade_id))
  const mapa = new Map(linhas.map((l) => [l.comunidade_id, l.papel]))
  return ((cs ?? []) as LinhaComunidade[]).map((r) => ({
    comunidade: paraComunidade(r),
    papel: mapa.get(r.id) ?? 'seguidor',
  }))
}

/** Papel do usuário atual nesta comunidade (null = não participa). */
export async function meuPapel(comunidadeId: string): Promise<PapelComunidade | null> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const uid = sessao.session?.user?.id
  if (!uid) return null
  const { data } = await sb()
    .from('membros_comunidade')
    .select('papel')
    .eq('comunidade_id', comunidadeId)
    .eq('usuario_id', uid)
    .maybeSingle()
  return data ? (data as { papel: PapelComunidade }).papel : null
}

export async function seguirComunidade(comunidadeId: string): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const uid = sessao.session?.user?.id
  if (!uid) throw new Error('Entre na sua conta para seguir uma comunidade.')
  const { error } = await sb()
    .from('membros_comunidade')
    .insert({ comunidade_id: comunidadeId, usuario_id: uid, papel: 'seguidor' })
  if (error && !error.message.includes('duplicate')) throw new Error(error.message)
}

export async function deixarComunidade(comunidadeId: string): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const uid = sessao.session?.user?.id
  if (!uid) return
  await sb().from('membros_comunidade').delete()
    .eq('comunidade_id', comunidadeId).eq('usuario_id', uid)
}

/** Lista membros (para a tela de gestão do admin). */
export async function listarMembros(comunidadeId: string): Promise<{ usuarioId: string; nome: string; avatar?: string; papel: PapelComunidade }[]> {
  const { sb } = await import('./supabase/client')
  const { data } = await sb()
    .from('membros_comunidade')
    .select('usuario_id, papel')
    .eq('comunidade_id', comunidadeId)
  const linhas = (data ?? []) as { usuario_id: string; papel: PapelComunidade }[]
  if (linhas.length === 0) return []

  const { data: perfis } = await sb()
    .from('perfis')
    .select('id, nome, foto_url')
    .in('id', linhas.map((l) => l.usuario_id))
  const mapa = new Map(((perfis ?? []) as { id: string; nome: string | null; foto_url: string | null }[])
    .map((p) => [p.id, p]))

  return linhas.map((l) => {
    const p = mapa.get(l.usuario_id)
    return {
      usuarioId: l.usuario_id,
      nome: p?.nome ?? 'Membro',
      avatar: p?.foto_url ?? undefined,
      papel: l.papel,
    }
  })
}

/** Promove/rebaixa um membro (só admins — a RLS garante). */
export async function definirPapel(comunidadeId: string, usuarioId: string, papel: PapelComunidade): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { error } = await sb()
    .from('membros_comunidade')
    .update({ papel })
    .eq('comunidade_id', comunidadeId)
    .eq('usuario_id', usuarioId)
  if (error) throw new Error(error.message)
}

/** Comunidades em que o usuário pode publicar (admin ou autor). */
export async function comunidadesQuePublico(): Promise<Comunidade[]> {
  const minhas = await minhasComunidades()
  return minhas.filter((m) => m.papel === 'admin' || m.papel === 'autor').map((m) => m.comunidade)
}
