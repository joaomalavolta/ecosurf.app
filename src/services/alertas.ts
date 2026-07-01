import type { CategoriaAlerta, GravidadeAlerta, Rascunho } from '../types/domain'
import { TEM_BACKEND } from './supabase/config'
import { sb } from './supabase/client'

/**
 * Service para o módulo "+ Nova Ação":
 * - Publicar alerta ambiental
 * - Publicar mutirão
 * - Gerenciar rascunhos
 */

async function authed() {
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u) throw new Error('Faça login para publicar.')
  return { sb: sb(), user: u, token: data.session!.access_token }
}

/* ─── Alerta Ambiental ─── */

export interface DadosAlerta {
  titulo: string
  categoria: CategoriaAlerta
  gravidade: GravidadeAlerta
  descricao?: string
  localNome?: string
  municipio: string
  uf: string
  lat: number
  lng: number
  recorrente?: boolean
  checkboxAceite: boolean
  images?: File[]
  keptImages?: string[]
}

export async function publicarAlerta(dados: DadosAlerta): Promise<string> {
  if (!TEM_BACKEND) throw new Error('Backend não disponível')
  const { sb, user } = await authed()

  // Upload de imagens
  const imagePaths: string[] = []
  if (dados.images) {
    for (const file of dados.images.slice(0, 3)) {
      const path = `alertas/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const { error } = await sb.storage.from('fotos').upload(path, file, { contentType: file.type })
      if (!error) imagePaths.push(path)
    }
  }

  const body = {
    titulo: dados.titulo,
    categoria: dados.categoria,
    status: 'identificado',
    gravidade: dados.gravidade,
    geom: `SRID=4326;POINT(${dados.lng} ${dados.lat})`,
    // Transparência total: sem coordenada embaralhada — o público vê o local exato.
    geom_aprox: `SRID=4326;POINT(${dados.lng} ${dados.lat})`,
    municipio: dados.municipio,
    uf: dados.uf.toUpperCase().slice(0, 2),
    local_nome: dados.localNome ?? null,
    precisao: 'exata',
    denunciante_id: user.id,
    anonima: false,
    descricao: dados.descricao ?? null,
    images: imagePaths.length > 0 ? imagePaths : null,
    recorrente: dados.recorrente ?? false,
    checkbox_aceite: dados.checkboxAceite,
  }

  const { data, error } = await sb.from('ameacas').insert(body).select('id').single()
  if (error) throw new Error(`Erro ao publicar: ${error.message}`)
  return data.id
}

/** Carrega um alerta ambiental para edição (somente o criador). */
export async function carregarAlertaParaEdicao(id: string): Promise<DadosAlerta & { id: string; imagesUrl?: string[] }> {
  if (!TEM_BACKEND) throw new Error('Backend não disponível')
  const { sb, user } = await authed()

  const { data, error } = await sb.from('ameacas')
    .select('*')
    .eq('id', id)
    .eq('denunciante_id', user.id)
    .single()

  if (error || !data) throw new Error('Registro não encontrado ou sem permissão.')

  return {
    id: data.id,
    titulo: data.titulo ?? '',
    categoria: data.categoria as CategoriaAlerta,
    gravidade: data.gravidade as GravidadeAlerta,
    descricao: data.descricao ?? undefined,
    localNome: data.local_nome ?? undefined,
    municipio: data.municipio ?? '',
    uf: data.uf ?? '',
    lat: data.geom ? 0 : -23.96, // placeholder (a geometria seria parseada se necessário)
    lng: data.geom ? 0 : -46.33,
    recorrente: data.recorrente ?? false,
    checkboxAceite: data.checkbox_aceite ?? true,
    imagesUrl: data.images ?? undefined,
  }
}

/** Atualiza um alerta ambiental existente (somente o criador). */
export async function atualizarAlerta(id: string, dados: DadosAlerta): Promise<void> {
  if (!TEM_BACKEND) throw new Error('Backend não disponível')
  const { sb, user } = await authed()

  // Upload de novas imagens
  const imagePaths: string[] = dados.keptImages ? [...dados.keptImages] : []
  if (dados.images && dados.images.length > 0) {
    for (const file of dados.images.slice(0, 3 - imagePaths.length)) {
      const path = `alertas/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
      const { error } = await sb.storage.from('fotos').upload(path, file, { contentType: file.type })
      if (!error) imagePaths.push(path)
    }
  }

  const body: Record<string, unknown> = {
    titulo: dados.titulo,
    categoria: dados.categoria,
    gravidade: dados.gravidade,
    municipio: dados.municipio,
    uf: dados.uf.toUpperCase().slice(0, 2),
    local_nome: dados.localNome ?? null,
    descricao: dados.descricao ?? null,
    recorrente: dados.recorrente ?? false,
    images: imagePaths.length > 0 ? imagePaths : null,
  }

  if (dados.lat && dados.lng) {
    body.geom = `SRID=4326;POINT(${dados.lng} ${dados.lat})`
    body.geom_aprox = `SRID=4326;POINT(${dados.lng + (Math.random() - 0.5) * 0.01} ${dados.lat + (Math.random() - 0.5) * 0.01})`
  }

  const { error } = await sb.from('ameacas').update(body).eq('id', id).eq('denunciante_id', user.id)
  if (error) throw new Error(`Erro ao atualizar: ${error.message}`)
}

/* ─── Mutirão ─── */

export interface DadosMutirao {
  titulo: string
  tipoAcao: string
  descricao?: string
  municipio: string
  uf: string
  lat: number
  lng: number
  quando: string
  horarioInicio?: string
  horarioFim?: string
  pontoEncontro?: string
  organizador?: string
  instituicao?: string
  contato?: string
  vagas?: number
  infoVoluntarios?: string
  imagemCapa?: File
  rascunho?: boolean
}

export async function publicarMutirao(dados: DadosMutirao): Promise<string> {
  if (!TEM_BACKEND) throw new Error('Backend não disponível')
  const { sb, user } = await authed()

  let imagemUrl: string | null = null
  if (dados.imagemCapa) {
    const path = `mutiroes/${user.id}/${Date.now()}.jpg`
    const { error } = await sb.storage.from('fotos').upload(path, dados.imagemCapa, { contentType: dados.imagemCapa.type })
    if (!error) {
      const { data: urlData } = sb.storage.from('fotos').getPublicUrl(path)
      imagemUrl = urlData.publicUrl
    }
  }

  const horario = [dados.horarioInicio, dados.horarioFim].filter(Boolean).join(' às ')

  const body = {
    id: crypto.randomUUID(),
    titulo: dados.titulo,
    tipo_acao: dados.tipoAcao,
    geom: `SRID=4326;POINT(${dados.lng} ${dados.lat})`,
    municipio: dados.municipio,
    uf: dados.uf.toUpperCase().slice(0, 2),
    quando: dados.quando,
    horario: horario || null,
    ponto_encontro: dados.pontoEncontro ?? null,
    organizador: dados.organizador ?? null,
    organizador_id: user.id,
    instituicao: dados.instituicao ?? null,
    contato: dados.contato ?? null,
    vagas: dados.vagas ?? null,
    info_voluntarios: dados.infoVoluntarios ?? null,
    imagem_url: imagemUrl,
    status: dados.rascunho ? 'rascunho' : 'agendado',
    rascunho: dados.rascunho ?? false,
    descricao: dados.descricao ?? null,
  }

  const { data, error } = await sb.from('mutiroes').insert(body).select('id').single()
  if (error) throw new Error(`Erro ao publicar: ${error.message}`)
  return data.id
}

/** Carrega um mutirão para edição (somente o criador). */
export async function carregarMutiraoParaEdicao(id: string): Promise<DadosMutirao & { id: string; imagemUrl?: string }> {
  if (!TEM_BACKEND) throw new Error('Backend não disponível')
  const { sb, user } = await authed()

  const { data, error } = await sb.from('mutiroes')
    .select('*')
    .eq('id', id)
    .eq('organizador_id', user.id)
    .single()

  if (error || !data) throw new Error('Mutirão não encontrado ou sem permissão.')

  const horarios = (data.horario ?? '').split(' às ')
  return {
    id: data.id,
    titulo: data.titulo ?? '',
    tipoAcao: data.tipo_acao ?? 'limpeza',
    descricao: data.descricao ?? undefined,
    municipio: data.municipio ?? '',
    uf: data.uf ?? '',
    lat: data.geom ? 0 : -23.96, // placeholder, real coords come from geom
    lng: data.geom ? 0 : -46.33,
    quando: data.quando ? new Date(data.quando).toISOString().slice(0, 10) : '',
    horarioInicio: horarios[0] ?? undefined,
    horarioFim: horarios[1] ?? undefined,
    pontoEncontro: data.ponto_encontro ?? undefined,
    organizador: data.organizador ?? undefined,
    instituicao: data.instituicao ?? undefined,
    contato: data.contato ?? undefined,
    vagas: data.vagas ?? undefined,
    infoVoluntarios: data.info_voluntarios ?? undefined,
    imagemUrl: data.imagem_url ?? undefined,
  }
}

/** Atualiza um mutirão existente (somente o criador). */
export async function atualizarMutirao(id: string, dados: DadosMutirao): Promise<void> {
  if (!TEM_BACKEND) throw new Error('Backend não disponível')
  const { sb, user } = await authed()

  let imagemUrl: string | undefined
  if (dados.imagemCapa) {
    const ext = dados.imagemCapa.name?.split('.').pop() || 'jpg'
    const path = `mutiroes/${user.id}/${Date.now()}.${ext}`
    const { error: upErr } = await sb.storage.from('fotos').upload(path, dados.imagemCapa, {
      contentType: dados.imagemCapa.type,
      upsert: true,
    })
    if (upErr) {
      console.error('Erro ao fazer upload da imagem:', upErr)
      throw new Error(`Erro ao enviar foto: ${upErr.message}`)
    }
    const { data: urlData } = sb.storage.from('fotos').getPublicUrl(path)
    imagemUrl = urlData.publicUrl
  }

  const horario = [dados.horarioInicio, dados.horarioFim].filter(Boolean).join(' às ')

  // Garantir formato correto de data (evitar problemas de timezone com new Date('YYYY-MM-DD'))
  const quandoStr = dados.quando.includes('T') ? dados.quando : `${dados.quando}T12:00:00`

  const body: Record<string, unknown> = {
    titulo: dados.titulo,
    tipo_acao: dados.tipoAcao,
    municipio: dados.municipio,
    uf: dados.uf.toUpperCase().slice(0, 2),
    quando: new Date(quandoStr).toISOString(),
    horario: horario || null,
    ponto_encontro: dados.pontoEncontro ?? null,
    organizador: dados.organizador ?? null,
    instituicao: dados.instituicao ?? null,
    contato: dados.contato ?? null,
    vagas: dados.vagas ?? null,
    info_voluntarios: dados.infoVoluntarios ?? null,
    descricao: dados.descricao ?? null,
  }

  if (dados.lat && dados.lng) {
    body.geom = `SRID=4326;POINT(${dados.lng} ${dados.lat})`
  }
  if (imagemUrl) {
    body.imagem_url = imagemUrl
  }

  const { error } = await sb.from('mutiroes').update(body).eq('id', id).eq('organizador_id', user.id)
  if (error) throw new Error(`Erro ao atualizar: ${error.message}`)
}

/* ─── Rascunhos ─── */

export async function excluirMutirao(id: string): Promise<void> {
  if (!TEM_BACKEND) throw new Error('Backend não disponível')
  const { sb, user } = await authed()

  // Deletar participantes primeiro (FK cascade deveria cuidar, mas seguro)
  await sb.from('mutirao_participantes').delete().eq('mutirao_id', id)

  const { error } = await sb.from('mutiroes').delete().eq('id', id).eq('organizador_id', user.id)
  if (error) throw new Error(`Erro ao excluir: ${error.message}`)
}

export async function salvarRascunho(tipo: 'alerta' | 'mutirao', dados: Record<string, unknown>): Promise<string> {
  if (!TEM_BACKEND) throw new Error('Backend não disponível')
  const { sb, user } = await authed()

  const { data, error } = await sb.from('rascunhos').upsert({
    user_id: user.id,
    tipo,
    dados,
    atualizado_em: new Date().toISOString(),
  }).select('id').single()
  if (error) throw new Error(`Erro ao salvar rascunho: ${error.message}`)
  return data.id
}

export async function listarRascunhos(): Promise<Rascunho[]> {
  if (!TEM_BACKEND) return []
  try {
    const { sb, user } = await authed()
    const { data, error } = await sb.from('rascunhos')
      .select('*')
      .eq('user_id', user.id)
      .order('atualizado_em', { ascending: false })
    if (error || !data) return []
    return data.map((r: any) => ({
      id: r.id,
      tipo: r.tipo,
      dados: r.dados,
      criadoEm: r.criado_em,
      atualizadoEm: r.atualizado_em,
    }))
  } catch {
    return []
  }
}

export async function excluirRascunho(id: string): Promise<void> {
  if (!TEM_BACKEND) return
  const { sb } = await authed()
  await sb.from('rascunhos').delete().eq('id', id)
}
