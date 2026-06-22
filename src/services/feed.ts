import type { FeedDia, Foto } from '../types/domain'
import { temBackend } from './api'
import { restFotosDoDia } from './supabase/rest'

/**
 * Feed do dia de um pico. Com backend e fotos reais, lê do Supabase e resolve
 * URLs assinadas (bucket privado). Sem fotos reais do dia (ou offline), volta
 * VAZIO — a timeline mostra "ainda sem fotos hoje". Nada de feed simulado.
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
            autorNome: r.autor_nome ?? 'anônimo',
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
  return { picoId, data: new Date().toISOString().slice(0, 10), fotos: [] }
}
