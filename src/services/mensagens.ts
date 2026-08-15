/**
 * Mensagens privadas (conversas 1:1).
 *
 * Tudo aqui exige sessão, então usa o SDK (dinâmico, fora do bundle do
 * Radar). A RLS é quem garante o sigilo: só participante lê ou escreve —
 * o cliente nunca é a única barreira.
 */

export interface Conversa {
  id: string
  ultimaEm: string
  lidaEm: string | null
  outroId: string
  outroNome: string | null
  outroFoto: string | null
  ultimaMensagem: string | null
  naoLidas: number
}

export interface Mensagem {
  id: string
  autorId: string
  corpo: string
  criadaEm: string
}

/** Abre (ou recupera) a conversa com alguém. Devolve o id da conversa. */
export async function abrirConversa(outroUsuarioId: string): Promise<string> {
  const { sb } = await import('./supabase/client')
  const { data, error } = await sb().rpc('abrir_conversa', { p_outro: outroUsuarioId })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Não foi possível abrir a conversa.')
  return data as string
}

/**
 * Caixa de entrada: conversas do usuário, mais recentes primeiro.
 *
 * São quatro consultas simples em vez de um join embutido: cada uma é uma
 * leitura direta de tabela, sem depender de como o PostgREST resolve relações.
 * A RLS faz o recorte — `conversas` já vem só com as minhas.
 */
export async function listarConversas(): Promise<Conversa[]> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const eu = sessao.session?.user?.id
  if (!eu) return []

  const { data: conversas, error } = await sb()
    .from('conversas')
    .select('id, ultima_em')
    .order('ultima_em', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  const minhas = (conversas ?? []) as { id: string; ultima_em: string }[]
  if (minhas.length === 0) return []

  const ids = minhas.map((c) => c.id)

  // Participantes traz os dois lados: o meu (para o 'lida_em') e o outro.
  const [{ data: parts }, { data: msgs }] = await Promise.all([
    sb().from('conversa_participantes').select('conversa_id, usuario_id, lida_em').in('conversa_id', ids),
    sb().from('mensagens').select('conversa_id, corpo, criada_em, autor_id').in('conversa_id', ids).order('criada_em', { ascending: false }),
  ])

  const participantes = (parts ?? []) as { conversa_id: string; usuario_id: string; lida_em: string | null }[]
  const outroDe = new Map<string, string>()
  const lidaDe = new Map<string, string | null>()
  for (const p of participantes) {
    if (p.usuario_id === eu) lidaDe.set(p.conversa_id, p.lida_em)
    else outroDe.set(p.conversa_id, p.usuario_id)
  }

  const perfisIds = [...new Set(outroDe.values())]
  const { data: perfis } = perfisIds.length
    ? await sb().from('perfis').select('id, nome, foto_url').in('id', perfisIds)
    : { data: [] as { id: string; nome: string | null; foto_url: string | null }[] }
  const perfilDe = new Map((perfis ?? []).map((p) => [p.id as string, p]))

  const todas = (msgs ?? []) as { conversa_id: string; corpo: string; criada_em: string; autor_id: string }[]

  return minhas
    .map((c) => {
      const doChat = todas.filter((m) => m.conversa_id === c.id)
      const outroId = outroDe.get(c.id) ?? ''
      const perfil = perfilDe.get(outroId)
      const lidaEm = lidaDe.get(c.id) ?? null
      // Não-lidas = mensagens do outro depois da minha última leitura.
      const corte = lidaEm ? new Date(lidaEm).getTime() : 0
      const naoLidas = doChat.filter(
        (m) => m.autor_id !== eu && new Date(m.criada_em).getTime() > corte,
      ).length
      return {
        id: c.id,
        ultimaEm: doChat[0]?.criada_em ?? c.ultima_em,
        lidaEm,
        outroId,
        outroNome: perfil?.nome ?? null,
        outroFoto: perfil?.foto_url ?? null,
        ultimaMensagem: doChat[0]?.corpo ?? null,
        naoLidas,
      }
    })
    .sort((a, b) => new Date(b.ultimaEm).getTime() - new Date(a.ultimaEm).getTime())
}

/** Quem está do outro lado — o cabeçalho da conversa precisa do nome e da foto. */
export async function outroParticipante(
  conversaId: string,
): Promise<{ id: string; nome: string | null; fotoUrl: string | null } | null> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const eu = sessao.session?.user?.id
  if (!eu) return null

  const { data: p } = await sb()
    .from('conversa_participantes')
    .select('usuario_id')
    .eq('conversa_id', conversaId)
    .neq('usuario_id', eu)
    .limit(1)
    .maybeSingle()
  const outroId = (p as { usuario_id: string } | null)?.usuario_id
  if (!outroId) return null

  const { data: perfil } = await sb()
    .from('perfis')
    .select('id, nome, foto_url')
    .eq('id', outroId)
    .maybeSingle()
  const pf = perfil as { nome: string | null; foto_url: string | null } | null
  return { id: outroId, nome: pf?.nome ?? null, fotoUrl: pf?.foto_url ?? null }
}

/** Últimas mensagens de uma conversa, devolvidas em ordem cronológica. */
export async function carregarMensagens(conversaId: string): Promise<Mensagem[]> {
  const { sb } = await import('./supabase/client')
  // Busca da mais nova para a mais velha e inverte: num papo comprido, o teto
  // tem que cortar o começo, não o fim — quem abre quer ver o que é recente.
  const { data, error } = await sb()
    .from('mensagens')
    .select('id, autor_id, corpo, criada_em')
    .eq('conversa_id', conversaId)
    .order('criada_em', { ascending: false })
    .limit(500)
  if (error) throw new Error(error.message)
  return ((data ?? []) as { id: string; autor_id: string; corpo: string; criada_em: string }[])
    .map((m) => ({ id: m.id, autorId: m.autor_id, corpo: m.corpo, criadaEm: m.criada_em }))
    .reverse()
}

/** Envia uma mensagem. O autor vem da sessão — a RLS confere. */
export async function enviarMensagem(conversaId: string, corpo: string): Promise<Mensagem> {
  const texto = corpo.trim()
  if (!texto) throw new Error('Escreva alguma coisa primeiro.')
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const eu = sessao.session?.user?.id
  if (!eu) throw new Error('Entre na sua conta para enviar mensagens.')

  const { data, error } = await sb()
    .from('mensagens')
    .insert({ conversa_id: conversaId, autor_id: eu, corpo: texto })
    .select('id, autor_id, corpo, criada_em')
    .single()
  if (error) throw new Error(error.message)
  const m = data as { id: string; autor_id: string; corpo: string; criada_em: string }
  return { id: m.id, autorId: m.autor_id, corpo: m.corpo, criadaEm: m.criada_em }
}

/** Marca a conversa como lida até agora (zera o contador de não-lidas). */
export async function marcarLida(conversaId: string): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  const eu = sessao.session?.user?.id
  if (!eu) return
  await sb()
    .from('conversa_participantes')
    .update({ lida_em: new Date().toISOString() })
    .eq('conversa_id', conversaId)
    .eq('usuario_id', eu)
}

/** Total de mensagens não lidas — alimenta o selo da caixa de entrada. */
export async function totalNaoLidas(): Promise<number> {
  try {
    const cs = await listarConversas()
    return cs.reduce((n, c) => n + c.naoLidas, 0)
  } catch {
    return 0
  }
}

/* ── Selo ─────────────────────────────────────────────────
 * O contador de não lidas mora em services/notificacoes.ts: lá ele vem junto
 * com o dos avisos, numa consulta só. Reexportado aqui para quem mexe com
 * mensagens não precisar saber disso.
 */
export { esquecerContadores as esquecerSeloNaoLidas } from './contadores'
