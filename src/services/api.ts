/**
 * Contrato da API do Ecosurf. Hoje só existe o mock; o backend real
 * (PostGIS/Supabase) implementa a mesma interface — a UI não muda.
 */
export interface NovaFoto {
  id: string
  picoId: string
  capturadaEm: string
  tipo?: 'report' | 'ameaca' | 'lixo' | 'ciencia'
  observacao?: string
  blob?: Blob
  /** Coordenadas do device na captura — o servidor decide a procedência. */
  capturaLat?: number
  capturaLng?: number
}

export interface EcosurfApi {
  enviarFoto(f: NovaFoto): Promise<{ id: string }>
}

/** Mock: simula latência e falha quando offline (para a fila reter). */
export const mockApi: EcosurfApi = {
  async enviarFoto(f) {
    await new Promise((r) => setTimeout(r, 600))
    if (!navigator.onLine) throw new Error('offline')
    return { id: f.id }
  },
}

/** Há backend configurado? (lê env sem importar o SDK — não bloteia o bundle) */
export function temBackend(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

let real: EcosurfApi | null = null
async function impl(): Promise<EcosurfApi> {
  if (!temBackend()) return mockApi
  if (!real) real = (await import('./supabase/api')).supabaseApi // chunk separado
  return real
}

/** Fachada: a UI e a fila offline usam isto; a troca mock↔backend é transparente. */
export const api: EcosurfApi = {
  async enviarFoto(f) {
    return (await impl()).enviarFoto(f)
  },
}

