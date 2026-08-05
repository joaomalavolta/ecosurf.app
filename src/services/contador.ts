/**
 * Contador de acessos via CounterAPI (counterapi.dev). Conta 1x por sessão do
 * navegador (sessionStorage) — em re-renders/navegações seguintes só lê o total.
 * Falha em silêncio (offline/bloqueio) devolvendo null, sem afetar o app.
 */
const BASE = 'https://api.counterapi.dev/v2/joao-malavoltas-team-4517/first-counter-4517'

export async function registrarAcesso(): Promise<number | null> {
  try {
    const jaContou = sessionStorage.getItem('ecosurf-acesso') === '1'
    const url = jaContou ? BASE : `${BASE}/up`
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!r.ok) return null
    if (!jaContou) sessionStorage.setItem('ecosurf-acesso', '1')
    return extrairContagem(await r.json())
  } catch {
    return null
  }
}

/** A CounterAPI v2 devolve { data: { up_count, value, ... } }; toleramos variações. */
function extrairContagem(j: unknown): number | null {
  const raiz = j && typeof j === 'object' ? (j as Record<string, unknown>) : {}
  const d = raiz.data && typeof raiz.data === 'object' ? (raiz.data as Record<string, unknown>) : raiz
  const v = d.up_count ?? d.value ?? d.count ?? d.up ?? null
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  return null
}
