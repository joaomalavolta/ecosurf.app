import { rest } from './supabase/rest'

export interface SurfistaResumo {
  id: string
  nome: string | null
  fotoUrl: string | null
  cidade: string | null
  criadoEm: string
}

const COLS = 'id,nome,foto_url,cidade,criado_em'

interface LinhaPerfil {
  id: string
  nome: string | null
  foto_url: string | null
  cidade: string | null
  criado_em: string
}

const paraSurfista = (r: LinhaPerfil): SurfistaResumo => ({
  id: r.id,
  nome: r.nome,
  fotoUrl: r.foto_url,
  cidade: r.cidade,
  criadoEm: r.criado_em,
})

/**
 * Novos surfistas na rede: perfis públicos com nome, dos mais recentes.
 * Via REST (sem SDK). Falha em silêncio devolvendo lista vazia.
 */
export async function restNovosSurfistas(limite = 16): Promise<SurfistaResumo[]> {
  try {
    const rows = await rest<LinhaPerfil[]>(
      `perfis_publicos?select=${COLS}&nome=not.is.null&order=criado_em.desc&limit=${limite}`,
    )
    return rows.map(paraSurfista)
  } catch {
    return []
  }
}

/**
 * Diretório de surfistas — a lista que alimenta a página "Surfistas".
 *
 * A busca por nome é feita no cliente de propósito: `ilike` no Postgres é
 * sensível a acento ("joao" não acha "João"), e a rede ainda cabe numa
 * página. Quando a base crescer, o caminho é uma função no banco com
 * unaccent + índice, trocando só esta função.
 */
export async function restListarSurfistas(limite = 200): Promise<SurfistaResumo[]> {
  try {
    const rows = await rest<LinhaPerfil[]>(
      `perfis_publicos?select=${COLS}&nome=not.is.null&order=criado_em.desc&limit=${limite}`,
    )
    return rows.map(paraSurfista)
  } catch {
    return []
  }
}

/** Compara ignorando acento e caixa — "joao" acha "João". */
export function normalizarBusca(s: string): string {
  return [...(s ?? '').normalize('NFD')]
    .filter((c) => c.charCodeAt(0) < 0x300 || c.charCodeAt(0) > 0x36f)
    .join('')
    .toLowerCase()
    .trim()
}

/** Filtra por nome ou cidade, sem acento-sensibilidade. */
export function filtrarSurfistas(lista: SurfistaResumo[], termo: string): SurfistaResumo[] {
  const q = normalizarBusca(termo)
  if (q.length === 0) return lista
  return lista.filter((u) =>
    normalizarBusca(u.nome ?? '').includes(q) || normalizarBusca(u.cidade ?? '').includes(q),
  )
}
