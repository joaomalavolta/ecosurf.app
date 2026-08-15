/**
 * Os dois selos do cabeçalho — mensagens e avisos — numa consulta só.
 *
 * Vive num arquivo próprio de propósito: o cabeçalho aparece em toda tela,
 * então isto entra no bundle inicial. Se morasse junto do resto do serviço de
 * notificações, arrastaria a listagem e a marcação de lidas para o Radar sem
 * necessidade (medido: 4,7 kB a mais no chunk principal).
 *
 * Vai por PostgREST puro, sem SDK, sobre uma view que já devolve as contas
 * prontas. Cache curto em memória evita repetir a cada navegação.
 */

export interface Contadores {
  mensagens: number
  notificacoes: number
}

const VAZIO: Contadores = { mensagens: 0, notificacoes: 0 }
const VALIDADE = 30_000
let cache: { em: number; valor: Contadores } | null = null

export function esquecerContadores() {
  cache = null
}

export async function restContadores(): Promise<Contadores> {
  if (cache && Date.now() - cache.em < VALIDADE) return cache.valor
  try {
    const { rest } = await import('./supabase/rest')
    const linhas = await rest<Contadores[]>('meus_contadores?select=mensagens,notificacoes')
    const valor = linhas[0] ?? VAZIO
    cache = { em: Date.now(), valor }
    return valor
  } catch {
    // Sem sessão (ou token vencido) o PostgREST barra — sem selo, sem drama.
    cache = { em: Date.now(), valor: VAZIO }
    return VAZIO
  }
}
