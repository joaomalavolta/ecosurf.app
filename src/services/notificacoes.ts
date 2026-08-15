/**
 * Central de notificações — o que o push não guarda.
 *
 * O push avisa na hora e some. Esta é a memória: quem recusou push, estava
 * sem rede ou simplesmente não viu, encontra aqui o que aconteceu.
 *
 * Os avisos são criados por gatilhos no banco (nunca pelo cliente), e a RLS
 * só entrega os seus. Nem você reescreve o texto de um aviso seu — marcar
 * como lido passa por uma função que mexe só no carimbo.
 */

import { esquecerContadores as esquecer } from './contadores'

export type TipoNotificacao = 'mensagem' | 'comunidade_membro' | 'comunidade_publicacao'

export interface Notificacao {
  id: string
  tipo: TipoNotificacao
  titulo: string
  corpo: string | null
  url: string | null
  atorId: string | null
  atorNome: string | null
  atorFoto: string | null
  lidaEm: string | null
  criadaEm: string
}

interface Linha {
  id: string
  tipo: TipoNotificacao
  titulo: string
  corpo: string | null
  url: string | null
  ator_id: string | null
  lida_em: string | null
  criada_em: string
}

/** Histórico, mais recentes primeiro. */
export async function listarNotificacoes(limite = 100): Promise<Notificacao[]> {
  const { sb } = await import('./supabase/client')
  const { data, error } = await sb()
    .from('notificacoes')
    .select('id, tipo, titulo, corpo, url, ator_id, lida_em, criada_em')
    .order('criada_em', { ascending: false })
    .limit(limite)
  if (error) throw new Error(error.message)
  const linhas = (data ?? []) as Linha[]
  if (linhas.length === 0) return []

  // Rosto de quem causou o aviso — uma consulta para a lista toda.
  const ids = [...new Set(linhas.map((l) => l.ator_id).filter((x): x is string => !!x))]
  const { data: perfis } = ids.length
    ? await sb().from('perfis').select('id, nome, foto_url').in('id', ids)
    : { data: [] as { id: string; nome: string | null; foto_url: string | null }[] }
  const perfilDe = new Map((perfis ?? []).map((p) => [p.id as string, p]))

  return linhas.map((l) => {
    const p = l.ator_id ? perfilDe.get(l.ator_id) : undefined
    return {
      id: l.id,
      tipo: l.tipo,
      titulo: l.titulo,
      corpo: l.corpo,
      url: l.url,
      atorId: l.ator_id,
      atorNome: p?.nome ?? null,
      atorFoto: p?.foto_url ?? null,
      lidaEm: l.lida_em,
      criadaEm: l.criada_em,
    }
  })
}

/** Marca tudo (ou alguns) como lido. Devolve quantos mudaram. */
export async function marcarLidas(ids?: string[]): Promise<number> {
  const { sb } = await import('./supabase/client')
  const { data, error } = await sb().rpc('marcar_notificacoes_lidas', { p_ids: ids ?? null })
  if (error) throw new Error(error.message)
  esquecer()
  return (data as number) ?? 0
}

/** Dispensa um aviso de vez. */
export async function dispensar(id: string): Promise<void> {
  const { sb } = await import('./supabase/client')
  const { error } = await sb().from('notificacoes').delete().eq('id', id)
  if (error) throw new Error(error.message)
  esquecer()
}

/* ── Selos do cabeçalho ─────────────────────────────────────────────────
 * Moram em contadores.ts, num arquivo próprio: o cabeçalho está em toda tela
 * e não pode arrastar a listagem inteira para o bundle inicial. Reexportado
 * aqui para quem já importa este serviço.
 */
export { restContadores, esquecerContadores, type Contadores } from './contadores'
