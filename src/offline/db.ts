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
  thumbBlob?: Blob
  videoBlob?: Blob
  videoMime?: string
  videoDuracaoS?: number
  capturaLat?: number
  capturaLng?: number
  /** Se preenchido, o pico é criado no envio (permite registrar 100% offline). */
  picoNovo?: import('../services/api').PicoNovo
  /** Comunidade que assina a foto (viaja com o registro na fila offline). */
  comunidadeId?: string | null
  status: 'na-fila' | 'enviando' | 'enviado' | 'falhou' | 'bloqueado'
  erro?: string
  criadoEm: number
}

/**
 * Registro do mapa aguardando rede — a denúncia nunca se perde.
 *
 * Guarda as duas famílias. `tipoRegistro` é opcional porque a fila pode ter
 * itens gravados antes da migration 0063, no IndexedDB de quem não abriu o
 * app desde então: ausente = 'alerta', que é o que eles são. Campo novo sem
 * índice não pede versão nova do banco local.
 *
 * `gravidade` virou opcional pelo mesmo motivo que na tabela: um registro
 * positivo não tem intensidade para avaliar. Se ficasse obrigatório aqui, o
 * ninho registrado sem sinal voltaria da fila como "gravidade média".
 */
export interface AlertaPendente {
  id: string
  titulo: string
  categoria: string
  tipoRegistro?: 'alerta' | 'positivo'
  gravidade?: string
  localNome?: string
  municipio: string
  uf: string
  lat: number
  lng: number
  ocorridoEm?: string
  blob?: Blob
  status: 'na-fila' | 'bloqueado'
  erro?: string
  criadoEm: number
}

interface EcosurfDB extends DBSchema {
  uploads: {
    key: string
    value: UploadPendente
    indexes: { 'by-status': string }
  }
  alertas: {
    key: string
    value: AlertaPendente
  }
}

let dbp: Promise<IDBPDatabase<EcosurfDB>> | null = null

export function db(): Promise<IDBPDatabase<EcosurfDB>> {
  if (!dbp) {
    dbp = openDB<EcosurfDB>('ecosurf', 2, {
      upgrade(d, versaoAntiga) {
        if (versaoAntiga < 1) {
          const s = d.createObjectStore('uploads', { keyPath: 'id' })
          s.createIndex('by-status', 'status')
        }
        if (versaoAntiga < 2) {
          d.createObjectStore('alertas', { keyPath: 'id' })
        }
      },
    })
  }
  return dbp
}
