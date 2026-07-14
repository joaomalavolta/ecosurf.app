import type { FeedDia, Foto } from '../types/domain'
import { temBackend } from './api'
import { restFotosDoDia } from './supabase/rest'

/**
 * Feed do dia de um pico. Com backend e fotos reais, lê do Supabase e resolve
 * URLs assinadas (bucket privado). Sem fotos reais do dia (ou offline), volta
 * VAZIO — a timeline mostra "ainda sem fotos hoje". Nada de feed simulado.
 */
export async function carregarFeed(picoId: string, dia?: Date): Promise<FeedDia> {
  if (temBackend()) {
    try {
      const rows = await restFotosDoDia(picoId, dia)
      if (rows.length) {
        const { urlAssinada } = await import('./supabase/storage')
        const fotos: Foto[] = await Promise.all(
          rows.map(async (r) => {
            let url: string | undefined
            let thumbUrl: string | undefined
            if (r.storage_path) {
              try {
                url = await urlAssinada(r.storage_path)
              } catch {
                /* URL assinada falhou — foto ficará sem imagem mas não derruba a página */
              }
            }
            if (r.thumb_path) {
              try {
                thumbUrl = await urlAssinada(r.thumb_path)
              } catch {
                /* sem thumb: o feed usa a foto cheia como fallback */
              }
            }
            // Vídeo só assina URL quando existe: o feed comum não paga por isso.
            let videoUrl: string | undefined
            if (r.video_path) {
              try {
                videoUrl = await urlAssinada(r.video_path)
              } catch { /* sem vídeo: fica o poster, que já é um registro válido */ }
            }
            return {
              id: r.id,
              picoId: r.pico_id,
              autorId: r.autor_id ?? '',
              autorNome: r.autor_nome ?? 'anônimo',
              autorAvatar: r.autor_avatar ?? undefined,
              comunidadeId: r.comunidade_id ?? undefined,
              comunidadeNome: r.comunidade_nome ?? undefined,
              comunidadeAvatar: r.comunidade_avatar ?? undefined,
              capturadaEm: r.capturada_em,
              url,
              thumbUrl,
              alturaMareM: r.altura_mare_m ?? undefined,
              ventoTipo: (r.vento_tipo ?? undefined) as Foto['ventoTipo'],
              observacao: r.observacao ?? undefined,
              procedencia: r.procedencia as Foto['procedencia'],
              rostosBorrados: false,
              ehVideo: r.tipo === 'video',
              videoUrl,
              duracaoS: r.duracao_s ?? undefined,
            }
          }),
        )
        return { picoId, data: new Date().toISOString().slice(0, 10), fotos }
      }
    } catch {
      /* fallback */
    }
  }
  return { picoId, data: new Date().toISOString().slice(0, 10), fotos: [] }
}

export async function carregarFeedGlobal(limite = 10): Promise<Foto[]> {
  if (temBackend()) {
    try {
      const { restUltimasFotosGlobais } = await import('./supabase/rest')
      const rows = await restUltimasFotosGlobais(limite)
      if (rows.length) {
        const { urlAssinada } = await import('./supabase/storage')
        const fotos: Foto[] = await Promise.all(
          rows.map(async (r) => {
            let url: string | undefined
            let thumbUrl: string | undefined
            if (r.storage_path) {
              try {
                url = await urlAssinada(r.storage_path)
              } catch { /* sem URL assinada: usa a pública adiante */ }
            }
            if (r.thumb_path) {
              try {
                thumbUrl = await urlAssinada(r.thumb_path)
              } catch { /* sem thumb: usa a foto cheia */ }
            }
            // Vídeo só assina URL quando existe: o feed comum não paga por isso.
            let videoUrl: string | undefined
            if (r.video_path) {
              try {
                videoUrl = await urlAssinada(r.video_path)
              } catch { /* sem vídeo: fica o poster, que já é um registro válido */ }
            }
            return {
              id: r.id,
              picoId: r.pico_id,
              autorId: r.autor_id ?? '',
              autorNome: r.autor_nome ?? 'anônimo',
              autorAvatar: r.autor_avatar ?? undefined,
              comunidadeId: r.comunidade_id ?? undefined,
              comunidadeNome: r.comunidade_nome ?? undefined,
              comunidadeAvatar: r.comunidade_avatar ?? undefined,
              capturadaEm: r.capturada_em,
              url,
              thumbUrl,
              alturaMareM: r.altura_mare_m ?? undefined,
              ventoTipo: (r.vento_tipo ?? undefined) as Foto['ventoTipo'],
              observacao: r.observacao ?? undefined,
              procedencia: r.procedencia as Foto['procedencia'],
              rostosBorrados: false,
              ehVideo: r.tipo === 'video',
              videoUrl,
              duracaoS: r.duracao_s ?? undefined,
            }
          })
        )
        return fotos.filter((f) => !!f.url)
      }
    } catch { /* offline/erro: cai para o seed */ }
  }
  return []
}
