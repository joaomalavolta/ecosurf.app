import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/**
 * Fila de uploads offline. Na praia com 3G ruim, a foto entra aqui primeiro
 * e sobe quando o sinal voltar — o registro nunca se perde por falta de rede.
 */
export interface UploadPendente {
  id: string
  picoId: string
  capturadaEm: string
  tipo?: 'report' | 'alerta' | 'lixo'
  observacao?: string
  blob?: Blob
  capturaLat?: number
  capturaLng?: number
  status: 'na-fila' | 'enviando' | 'enviado' | 'falhou' | 'bloqueado'
  erro?: string
  criadoEm: number
}

interface EcosurfDB extends DBSchema {
  uploads: {
    key: string
    value: UploadPendente
    indexes: { 'by-status': string }
  }
}

let dbp: Promise<IDBPDatabase<EcosurfDB>> | null = null

export function db(): Promise<IDBPDatabase<EcosurfDB>> {
  if (!dbp) {
    dbp = openDB<EcosurfDB>('ecosurf', 1, {
      upgrade(d) {
        const s = d.createObjectStore('uploads', { keyPath: 'id' })
        s.createIndex('by-status', 'status')
      },
    })
  }
  return dbp
}
