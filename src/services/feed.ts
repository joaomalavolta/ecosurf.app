import type { FeedDia, Foto } from '../types/domain'
import { temBackend } from './api'
import { restFotosDoDia } from './supabase/rest'
import { feedDoDia as feedMock } from '../data/mockFeed'

/**
 * Feed do dia de um pico. Com backend e fotos reais, lê do Supabase e resolve
 * URLs assinadas (bucket privado). Sem fotos ainda (ou offline), cai no demo
 * para a timeline não nascer vazia enquanto não há uploads.
 */
export async function carregarFeed(picoId: string): Promise<FeedDia> {
  if (temBackend()) {
    try {
      const rows = await restFotosDoDia(picoId)
      if (rows.length) {
        const { urlAssinada } = await import('./supabase/storage')
        const fotos: Foto[] = await Promise.all(
          rows.map(async (r) => ({
            id: r.id,
            picoId: r.pico_id,
            autorId: '',
            autorNome: 'anônimo',
            capturadaEm: r.capturada_em,
            url: r.storage_path ? await urlAssinada(r.storage_path) : undefined,
            alturaMareM: r.altura_mare_m ?? undefined,
            ventoTipo: (r.vento_tipo ?? undefined) as Foto['ventoTipo'],
            observacao: r.observacao ?? undefined,
            procedencia: r.procedencia as Foto['procedencia'],
            rostosBorrados: false,
          })),
        )
        return { picoId, data: new Date().toISOString().slice(0, 10), fotos }
      }
    } catch {
      /* fallback */
    }
  }
  return feedMock(picoId)
}
