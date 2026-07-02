import { TEM_BACKEND } from './supabase/config'

/**
 * Contrato da API do Ecosurf. Hoje só existe o mock; o backend real
 * (PostGIS/Supabase) implementa a mesma interface — a UI não muda.
 */
/** Dados para criar um pico que ainda não existe — permite registrar offline. */
export interface PicoNovo {
  nome: string
  lat: number
  lng: number
  municipio: string
  uf: string
  praia?: string
}

export interface NovaFoto {
  id: string
  picoId: string
  capturadaEm: string
  tipo?: 'report' | 'alerta' | 'lixo'
  observacao?: string
  blob?: Blob
  /** Miniatura (~400px WebP) gerada no upload; feed usa esta versão leve. */
  thumbBlob?: Blob
  /** Coordenadas do device na captura — o servidor decide a procedência. */
  capturaLat?: number
  capturaLng?: number
  /** Se preenchido, o pico é criado no envio (antes da foto). Vazio = pico já existe. */
  picoNovo?: PicoNovo
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

/** Há backend configurado? (com a config padrão embutida, sempre sim no deploy) */
export function temBackend(): boolean {
  return TEM_BACKEND
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

