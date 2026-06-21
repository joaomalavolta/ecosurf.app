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
  procedencia: 'no-local' | 'galeria' | 'nao-verificado'
  geofenceOk: boolean
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

export const api: EcosurfApi = mockApi
