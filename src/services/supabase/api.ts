import { sb } from './client'
import type { EcosurfApi, NovaFoto } from '../api'

/**
 * Exige usuário IDENTIFICADO (não anônimo). Sem contribuição anônima:
 * se não houver sessão real, falha — a UI deve pedir login (telefone/e-mail).
 */
async function usuarioAtual(): Promise<string> {
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u || u.is_anonymous) {
    throw new Error('Entre com seu telefone ou e-mail para publicar.')
  }
  return u.id
}

/** Implementação real do contrato. Procedência/geofence são decididos no servidor. */
export const supabaseApi: EcosurfApi = {
  async enviarFoto(f: NovaFoto) {
    const autorId = await usuarioAtual()
    // Pico ainda não existe? Cria agora (com retry embutido) e usa o id gerado.
    // Assim o registro inteiro — criar pico + subir foto — é uma unidade na fila
    // offline: some o sinal na praia, tudo sobe junto quando a internet volta.
    let picoId = f.picoId
    if (f.picoNovo) {
      const { restInserirPico } = await import('./rest')
      picoId = await restInserirPico(f.picoNovo)
    }
    const path = `${picoId}/${f.id}.webp`
    const thumbPath = `${picoId}/${f.id}.thumb.webp`
    if (f.blob) {
      const up = await sb().storage.from('fotos').upload(path, f.blob, {
        contentType: 'image/webp',
        upsert: false,
      })
      if (up.error) throw up.error
    }
    // Miniatura é opcional: se falhar, o feed cai na foto cheia — não derruba o envio.
    let thumbEnviado = false
    if (f.thumbBlob) {
      const upThumb = await sb().storage.from('fotos').upload(thumbPath, f.thumbBlob, {
        contentType: 'image/webp',
        upsert: false,
      })
      if (!upThumb.error) thumbEnviado = true
    }
    // Clipe de vídeo (≤5s): aditivo — storage_path/thumb_path seguem sendo o
    // poster (frame), então todo consumidor antigo continua funcionando.
    let videoPath: string | null = null
    if (f.videoBlob && f.videoMime) {
      const ext = f.videoMime.includes('mp4') ? 'mp4' : 'webm'
      const vPath = `${picoId}/${f.id}.video.${ext}`
      const upVideo = await sb().storage.from('fotos').upload(vPath, f.videoBlob, {
        contentType: f.videoMime.split(';')[0],
        upsert: false,
      })
      if (upVideo.error) throw upVideo.error
      videoPath = vPath
    }
    const { error } = await sb()
      .from('fotos')
      .insert({
        id: f.id,
        pico_id: picoId,
        autor_id: autorId,
        capturada_em: f.capturadaEm,
        storage_path: f.blob ? path : null,
        thumb_path: thumbEnviado ? thumbPath : null,
        observacao: f.observacao,
        captura_lat: f.capturaLat ?? null,
        captura_lng: f.capturaLng ?? null,
        comunidade_id: f.comunidadeId ?? null,
        tipo: videoPath ? 'video' : 'foto',
        duracao_s: videoPath ? (f.videoDuracaoS ?? null) : null,
        video_path: videoPath,
        // status, procedencia e geofence_ok são definidos por triggers no servidor
      })
    if (error) throw error
    return { id: f.id }
  },
}
