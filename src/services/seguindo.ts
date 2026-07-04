/**
 * Seguir usuários (v1). Mesmo padrão de três camadas dos favoritos:
 * memória (resposta instantânea) + cache local + Supabase (RLS self).
 * Decisões de produto: sem contagem pública de seguidores e sem
 * notificações — seguir só alimenta o filtro "Seguindo" do feed.
 */

const CHAVE = 'ecosurf.seguindo'
let seguindo = new Set<string>()
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
      localStorage.setItem(CHAVE, JSON.stringify([...seguindo]))
    }
  } catch { /* modo privado: segue em memória */ }
}

/** Carrega quem o usuário segue (cache imediato; Supabase quando logado). */
export async function carregarSeguindo(): Promise<Set<string>> {
  if (!carregado) {
    seguindo = lerCache()
    carregado = true
  }
  try {
    const { temBackend } = await import('./api')
    if (!temBackend()) return new Set(seguindo)
    const { sb } = await import('./supabase/client')
    const { data: sess } = await sb().auth.getSession()
    if (!sess.session?.user) return new Set(seguindo)
    const { data } = await sb().from('seguidores').select('seguido_id')
    if (data) {
      const doServidor = new Set(data.map((r) => r.seguido_id as string))
      for (const id of seguindo) {
        if (!doServidor.has(id)) void sincronizar(id, true)
      }
      seguindo = new Set([...doServidor, ...seguindo])
      gravarCache()
    }
  } catch { /* sem rede: cache cobre */ }
  return new Set(seguindo)
}

async function sincronizar(usuarioId: string, seguir: boolean): Promise<void> {
  try {
    const { temBackend } = await import('./api')
    if (!temBackend()) return
    const { sb } = await import('./supabase/client')
    const { data: sess } = await sb().auth.getSession()
    const uid = sess.session?.user?.id
    if (!uid || uid === usuarioId) return
    if (seguir) {
      await sb().from('seguidores').upsert({ seguidor_id: uid, seguido_id: usuarioId })
    } else {
      await sb().from('seguidores').delete().eq('seguidor_id', uid).eq('seguido_id', usuarioId)
    }
  } catch { /* rede falhou: cache mantém; próxima carga mescla */ }
}

export function estaSeguindo(usuarioId: string): boolean {
  if (!carregado) {
    seguindo = lerCache()
    carregado = true
  }
  return seguindo.has(usuarioId)
}

/** Alterna e retorna o novo estado. UI na hora; sync em background. */
export function toggleSeguir(usuarioId: string): boolean {
  if (!carregado) {
    seguindo = lerCache()
    carregado = true
  }
  const agora = !seguindo.has(usuarioId)
  if (agora) seguindo.add(usuarioId)
  else seguindo.delete(usuarioId)
  gravarCache()
  void sincronizar(usuarioId, agora)
  return agora
}
