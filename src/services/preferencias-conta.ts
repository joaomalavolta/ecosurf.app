/**
 * Preferências persistentes por conta — fundação do "Meu Ecosurf".
 * Mesmas três camadas dos favoritos, em espírito de praia (rede instável):
 *  1. MEMÓRIA: objeto por categoria — leitura síncrona, UI responde na hora.
 *  2. CACHE LOCAL (localStorage): sobrevive a recarregar e funciona offline.
 *  3. SUPABASE (tabela user_preferences, RLS por dono): sincroniza entre
 *     aparelhos quando há sessão. Falha de rede não desfaz a escolha.
 *
 * Regras:
 *  - Escrita é POR CATEGORIA (coluna JSONB própria): salvar a aparência não
 *    sobrescreve a timeline, e vice-versa. Debounce por categoria evita
 *    metralhar o banco em toggles rápidos.
 *  - Na primeira sincronização de uma conta sem preferências no servidor, as
 *    escolhas locais SOBEM automaticamente (adoção silenciosa — são poucas e
 *    inofensivas; nada de modal). Quando o servidor já tem dados, ele vence.
 *  - Deslogado, tudo continua funcionando só nas camadas 1–2.
 */

export type CategoriaPref = 'aparencia' | 'timeline' | 'feed' | 'privacidade'
type Prefs = Partial<Record<CategoriaPref, Record<string, unknown>>>

const CHAVE = 'ecosurf.prefs'
const CATEGORIAS: CategoriaPref[] = ['aparencia', 'timeline', 'feed', 'privacidade']
const DEBOUNCE_MS = 800

let prefs: Prefs = {}
let carregado = false
const timers = new Map<CategoriaPref, ReturnType<typeof setTimeout>>()
const ouvintes = new Set<() => void>()

function lerCache(): Prefs {
  try {
    if (typeof localStorage === 'undefined') return {}
    return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Prefs
  } catch {
    return {}
  }
}

function gravarCache(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CHAVE, JSON.stringify(prefs))
    }
  } catch { /* quota/privado: segue só em memória */ }
}

function garantirCarga(): void {
  if (!carregado) {
    prefs = lerCache()
    carregado = true
  }
}

function avisar(): void {
  ouvintes.forEach((fn) => fn())
}

/** Assina mudanças (para hooks de UI). Retorna o unsubscribe. */
export function assinarPreferencias(fn: () => void): () => void {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

/** Leitura síncrona com padrão — segura antes de qualquer sincronização. */
export function lerPreferencia<T>(categoria: CategoriaPref, chave: string, padrao: T): T {
  garantirCarga()
  const v = prefs[categoria]?.[chave]
  return v === undefined ? padrao : (v as T)
}

/** Grava na hora (memória + cache) e agenda o envio da categoria ao banco. */
export function gravarPreferencia(categoria: CategoriaPref, chave: string, valor: unknown): void {
  garantirCarga()
  prefs = { ...prefs, [categoria]: { ...(prefs[categoria] ?? {}), [chave]: valor } }
  gravarCache()
  avisar()
  const t = timers.get(categoria)
  if (t) clearTimeout(t)
  timers.set(categoria, setTimeout(() => { void enviarCategoria(categoria) }, DEBOUNCE_MS))
}

async function sessaoAtual(): Promise<{ sb: Awaited<ReturnType<typeof importaSb>>; uid: string } | null> {
  const { temBackend } = await import('./api')
  if (!temBackend()) return null
  const sb = await importaSb()
  const { data: sess } = await sb.auth.getSession()
  const uid = sess.session?.user?.id
  return uid ? { sb, uid } : null
}

async function importaSb() {
  const { sb } = await import('./supabase/client')
  return sb()
}

async function enviarCategoria(categoria: CategoriaPref): Promise<void> {
  try {
    const s = await sessaoAtual()
    if (!s) return
    await s.sb
      .from('user_preferences')
      .upsert({ user_id: s.uid, [categoria]: prefs[categoria] ?? {} }, { onConflict: 'user_id' })
  } catch { /* rede falhou: cache local mantém; próxima carga reenvia */ }
}

/**
 * Sincroniza com a conta (chamar no boot e após login). Idempotente.
 *  - Servidor tem dados → servidor vence categoria a categoria; aplica local.
 *  - Servidor vazio e local tem escolhas → sobem (adoção silenciosa).
 * Retorna as preferências vigentes.
 */
export async function carregarPreferencias(): Promise<Prefs> {
  garantirCarga()
  try {
    const s = await sessaoAtual()
    if (!s) return prefs
    const { data } = await s.sb
      .from('user_preferences')
      .select('aparencia, timeline, feed, privacidade')
      .maybeSingle()
    if (data) {
      for (const c of CATEGORIAS) {
        const doServidor = data[c] as Record<string, unknown> | null
        if (doServidor && Object.keys(doServidor).length > 0) prefs = { ...prefs, [c]: doServidor }
      }
      gravarCache()
      avisar()
      // Categorias que só existem localmente sobem agora.
      for (const c of CATEGORIAS) {
        const local = prefs[c]
        const doServidor = data[c] as Record<string, unknown> | null
        if (local && Object.keys(local).length > 0 && (!doServidor || Object.keys(doServidor).length === 0)) {
          void enviarCategoria(c)
        }
      }
    } else if (Object.values(prefs).some((c) => c && Object.keys(c).length > 0)) {
      // Conta nova no servidor: adota as escolhas deste aparelho.
      for (const c of CATEGORIAS) {
        if (prefs[c] && Object.keys(prefs[c]!).length > 0) void enviarCategoria(c)
      }
    }
  } catch { /* sem rede: cache local já cobre */ }
  return prefs
}

/** Restaura UMA categoria ao padrão (local + servidor). */
export async function restaurarCategoria(categoria: CategoriaPref): Promise<void> {
  garantirCarga()
  prefs = { ...prefs, [categoria]: {} }
  gravarCache()
  avisar()
  try {
    const s = await sessaoAtual()
    if (!s) return
    await s.sb
      .from('user_preferences')
      .upsert({ user_id: s.uid, [categoria]: {} }, { onConflict: 'user_id' })
  } catch { /* offline: cache local já restaurou; próxima escrita sincroniza */ }
}
