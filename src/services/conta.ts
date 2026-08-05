import { SUPABASE_URL, SUPABASE_KEY } from './supabase/config'

/**
 * Identidade do usuário logado SEM carregar o SDK. Lê uid/email da sessão que o
 * supabase-js persiste no localStorage e busca papel/nome/foto via PostgREST
 * com a chave anon (campos públicos). Mantém o Radar leve — o SDK só entra
 * quando o usuário faz algo que precisa dele (login, upload, sair). Usar a
 * chave anon evita falha quando o access_token persistido está expirado.
 */
export interface MinhaConta {
  id?: string
  email?: string
  papel: string
  nome?: string
  avatarUrl?: string
}

const BASE = SUPABASE_URL
const KEY = SUPABASE_KEY

/** Extrai o `sub` (uid) de um JWT sem libs — fallback caso a sessão não traga user.id. */
function jwtSub(token?: string): string | undefined {
  if (!token) return undefined
  try {
    let b = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    b += '='.repeat((4 - (b.length % 4)) % 4)
    return JSON.parse(atob(b))?.sub
  } catch {
    return undefined
  }
}

export async function restMinhaConta(): Promise<MinhaConta> {
  try {
    let raw = localStorage.getItem(`sb-${new URL(BASE).hostname.split('.')[0]}-auth-token`)
    if (!raw) {
      // fallback: varre as chaves (cobre variações de ref/projeto)
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          raw = localStorage.getItem(k)
          break
        }
      }
    }
    if (!raw) return { papel: 'user' }
    const parsed = JSON.parse(raw)
    const ses = parsed?.currentSession ?? parsed
    const uid: string | undefined = ses?.user?.id ?? jwtSub(ses?.access_token)
    const email: string | undefined = ses?.user?.email
    if (!uid) return { papel: 'user' }
    const r = await fetch(
      `${BASE}/rest/v1/perfis?select=papel,nome,foto_url&id=eq.${encodeURIComponent(uid)}`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
    )
    if (!r.ok) return { id: uid, email, papel: 'user' }
    const rows = (await r.json()) as { papel: string; nome: string | null; foto_url: string | null }[]
    return {
      id: uid,
      email,
      papel: rows[0]?.papel ?? 'user',
      nome: rows[0]?.nome ?? undefined,
      avatarUrl: rows[0]?.foto_url ?? undefined,
    }
  } catch {
    return { papel: 'user' }
  }
}
