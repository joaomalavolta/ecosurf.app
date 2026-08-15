/**
 * Denúncia de conversa e fila de moderação.
 *
 * Mora fora de services/moderacao.ts de propósito: aquele arquivo é importado
 * de forma estática pela timeline do Radar (por causa de `denunciarFoto`), e
 * tudo que crescesse lá entraria no bundle inicial. Isto aqui só é carregado
 * por quem abre o menu de denúncia ou a tela de moderação.
 */

import { temBackend } from './api'

/** Motivos de denúncia de conversa — poucos e claros, para escolher rápido. */
export const MOTIVOS_CONVERSA = [
  { id: 'assedio', rotulo: 'Assédio ou ameaça' },
  { id: 'spam', rotulo: 'Spam ou golpe' },
  { id: 'odio', rotulo: 'Discurso de ódio' },
  { id: 'impróprio', rotulo: 'Conteúdo impróprio' },
  { id: 'outro', rotulo: 'Outro motivo' },
] as const

/**
 * Denuncia uma pessoa por causa de uma conversa.
 *
 * Vai para a MESMA fila das denúncias de foto: quem modera olha num lugar só.
 * O denunciante não lê a fila — só moderação vê o que foi denunciado.
 */
export async function denunciarConversa(
  alvoId: string,
  conversaId: string | null,
  motivo: string,
  detalhe = '',
): Promise<void> {
  if (!temBackend()) throw new Error('Backend não configurado')
  const { sb } = await import('./supabase/client')
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u || u.is_anonymous) throw new Error('Entre para denunciar.')
  const { error } = await sb().from('denuncias').insert({
    tipo: 'conversa',
    autor_id: u.id,
    alvo_id: alvoId,
    conversa_id: conversaId,
    motivo,
    detalhe: detalhe.trim() || null,
  })
  if (error) throw new Error(error.message)
}

export interface DenunciaItem {
  id: string
  tipo: 'foto' | 'conversa'
  /** Nulo em denúncia de conversa — a tela precisa checar antes de usar. */
  foto_id: string | null
  alvo_id: string | null
  alvo_nome?: string | null
  conversa_id: string | null
  motivo: string | null
  detalhe: string | null
  status: string
  criada_em: string
}

/** Fila de moderação: fotos e conversas, as abertas primeiro. */
export async function listarDenuncias(): Promise<DenunciaItem[]> {
  if (!temBackend()) return []
  const { sb } = await import('./supabase/client')
  const { data, error } = await sb()
    .from('denuncias')
    .select('id,tipo,foto_id,alvo_id,conversa_id,motivo,detalhe,status,criada_em')
    .eq('status', 'aberta')
    .order('criada_em', { ascending: false })
  if (error) throw error
  const itens = (data ?? []) as DenunciaItem[]

  // Nome de quem foi denunciado — sem isso o moderador julga um uuid.
  const ids = [...new Set(itens.map((i) => i.alvo_id).filter((x): x is string => !!x))]
  if (ids.length === 0) return itens
  const { data: perfis } = await sb().from('perfis').select('id,nome').in('id', ids)
  const mapa = new Map(((perfis ?? []) as { id: string; nome: string | null }[]).map((p) => [p.id, p.nome]))
  return itens.map((i) => ({ ...i, alvo_nome: i.alvo_id ? mapa.get(i.alvo_id) ?? null : null }))
}

/** Fecha uma denúncia: resolvida (agiu) ou arquivada (sem procedência). */
export async function resolverDenuncia(id: string, status: 'resolvida' | 'arquivada'): Promise<void> {
  if (!temBackend()) return
  const { sb } = await import('./supabase/client')
  const { data: sessao } = await sb().auth.getSession()
  // O `.select()` revela a recusa da RLS: sem ele, um UPDATE barrado afeta
  // 0 linhas e o PostgREST não devolve erro nenhum.
  const { data, error } = await sb()
    .from('denuncias')
    .update({ status, resolvida_em: new Date().toISOString(), resolvida_por: sessao.session?.user?.id ?? null })
    .eq('id', id)
    .select('id')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('Sem permissão para fechar esta denúncia.')
}
