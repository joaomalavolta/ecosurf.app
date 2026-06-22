import type { FeedDia, Foto, EventoVento } from '../types/domain'
import { alturaMare } from '../lib/tide'

/** ISO de hoje na hora h (fração). Mantém o feed "do dia" sempre atual no demo. */
function hojeAs(horaFrac: number): string {
  const d = new Date()
  const h = Math.floor(horaFrac)
  const m = Math.round((horaFrac - h) * 60)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function foto(
  id: string,
  picoId: string,
  autorNome: string,
  horaFrac: number,
  observacao: string,
  ventoTipo: Foto['ventoTipo'],
  procedencia: Foto['procedencia'] = 'no-local',
): Foto {
  return {
    id,
    picoId,
    autorId: autorNome.toLowerCase(),
    autorNome,
    capturadaEm: hojeAs(horaFrac),
    alturaMareM: Number(alturaMare(horaFrac).toFixed(2)), // dot fica sobre a curva
    ventoTipo,
    observacao,
    procedencia,
    rostosBorrados: false,
  }
}

/** Feed do dia da Praia do Sonho — a leitura visual do mar ao longo do dia. */
export const feedPraiaDoSonho: FeedDia = {
  picoId: 'praia-do-sonho',
  data: new Date().toISOString().slice(0, 10),
  fotos: [
    foto('f1', 'praia-do-sonho', 'Rafa', 6.33, 'Clássico no amanhecer, terral limpando.', 'terral'),
    foto('f2', 'praia-do-sonho', 'Bia', 9.17, 'Encheu e ficou consistente, séries certinhas.', 'terral'),
    foto('f3', 'praia-do-sonho', 'Téo', 12.75, 'Mexeu com lateral, crowd subindo.', 'lateral'),
    foto('f4', 'praia-do-sonho', 'Lu', 16.33, 'Entrou maral, perdeu a forma no fim da tarde.', 'maral', 'galeria'),
  ],
}

export const eventosVentoDoDia: EventoVento[] = [
  { hora: 6, rotulo: 'terral' },
  { hora: 13, rotulo: 'entrou maral' },
]

const feeds: Record<string, FeedDia> = {
  'praia-do-sonho': feedPraiaDoSonho,
}

export function feedDoDia(picoId: string): FeedDia {
  return feeds[picoId] ?? { picoId, data: new Date().toISOString().slice(0, 10), fotos: [] }
}
