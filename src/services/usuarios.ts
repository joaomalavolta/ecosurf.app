import { rest } from './supabase/rest'

export interface SurfistaResumo {
  id: string
  nome: string | null
  fotoUrl: string | null
  cidade: string | null
  criadoEm: string
}

/**
 * Novos surfistas na rede: perfis públicos com nome, dos mais recentes.
 * Via REST (sem SDK). Falha em silêncio devolvendo lista vazia.
 */
export async function restNovosSurfistas(limite = 16): Promise<SurfistaResumo[]> {
  try {
    const rows = await rest<{ id: string; nome: string | null; foto_url: string | null; cidade: string | null; criado_em: string }[]>(
      `perfis_publicos?select=id,nome,foto_url,cidade,criado_em&nome=not.is.null&order=criado_em.desc&limit=${limite}`,
    )
    return rows.map((r) => ({ id: r.id, nome: r.nome, fotoUrl: r.foto_url, cidade: r.cidade, criadoEm: r.criado_em }))
  } catch {
    return []
  }
}
