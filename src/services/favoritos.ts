/**
 * Favoritos por usuário. Três camadas, em espírito de praia (rede instável):
 *  1. MEMÓRIA: um Set — a estrela responde na hora (otimista).
 *  2. CACHE LOCAL (localStorage): sobrevive a recarregar a página e funciona
 *     deslogado/offline.
 *  3. SUPABASE (tabela favoritos, RLS por dono): sincroniza entre aparelhos
 *     quando há sessão. Falha de rede não desfaz a escolha — tenta na próxima.
 */

const CHAVE = 'ecosurf.favoritos'
let favoritos = new Set<string>()
let carregado = false

function lerCache(): Set<string> {
  try {
    if (typeof localStorage === 'undefined') return new Set()
    return new Set(JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function gravarCache(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CHAVE, JSON.stringify([...favoritos]))
    }
  } catch { /* quota/privado: segue só em memória */ }
}

/** Carrega favoritos (cache imediato; Supabase quando logado). Idempotente. */
export async function carregarFavoritos(): Promise<Set<string>> {
  if (!carregado) {
    favoritos = lerCache()
    carregado = true
  }
  try {
    const { temBackend } = await import('./api')
    if (!temBackend()) return new Set(favoritos)
    const { sb } = await import('./supabase/client')
    const { data: sess } = await sb().auth.getSession()
    if (!sess.session?.user) return new Set(favoritos)
    const { data } = await sb().from('favoritos').select('pico_id')
    if (data) {
      // Servidor é a verdade quando logado; mescla escolhas locais ainda não subidas.
      const doServidor = new Set(data.map((r) => r.pico_id as string))
      for (const id of favoritos) {
        if (!doServidor.has(id)) void sincronizar(id, true)
      }
      favoritos = new Set([...doServidor, ...favoritos])
      gravarCache()
    }
  } catch { /* sem rede: cache local já cobre */ }
  return new Set(favoritos)
}

async function sincronizar(picoId: string, favorito: boolean): Promise<void> {
  try {
    const { temBackend } = await import('./api')
    if (!temBackend()) return
    const { sb } = await import('./supabase/client')
    const { data: sess } = await sb().auth.getSession()
    const uid = sess.session?.user?.id
    if (!uid) return
    if (favorito) {
      await sb().from('favoritos').upsert({ user_id: uid, pico_id: picoId })
    } else {
      await sb().from('favoritos').delete().eq('user_id', uid).eq('pico_id', picoId)
    }
  } catch { /* rede falhou: o cache local mantém a escolha; próxima carga mescla */ }
}

export function ehFavorito(picoId: string): boolean {
  if (!carregado) {
    favoritos = lerCache()
    carregado = true
  }
  return favoritos.has(picoId)
}

/** Alterna e retorna o novo estado. UI atualiza na hora; sync em background. */
export function toggleFavorito(picoId: string): boolean {
  if (!carregado) {
    favoritos = lerCache()
    carregado = true
  }
  const agora = !favoritos.has(picoId)
  if (agora) favoritos.add(picoId)
  else favoritos.delete(picoId)
  gravarCache()
  void sincronizar(picoId, agora)
  return agora
}
