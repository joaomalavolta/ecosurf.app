import type { CategoriaRegistro, GravidadeAlerta, Rascunho, TipoRegistro } from '../types/domain'
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

/* ─── Alerta ambiental e registro positivo ─── */

export interface DadosAlerta {
  /** Comunidade que assina a publicação (admin/autor). */
  comunidadeId?: string | null
  titulo: string
  categoria: CategoriaRegistro
  /**
   * Qual metade do mapa. Ausente = 'alerta', que é o default da coluna e o
   * que todo registro anterior à migration 0063 é.
   */
  tipoRegistro?: TipoRegistro
  /** Só em alerta. Registro positivo grava NULL — não há o que escalonar. */
  gravidade?: GravidadeAlerta
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
  /** Quando o impacto foi observado (fluxo fora-do-local). Nulo = criada_em. */
  ocorridoEm?: string
}

export async function publicarAlerta(dados: DadosAlerta): Promise<string> {
  if (!TEM_BACKEND) throw new Error('Backend não disponível')
  const { sb, user } = await authed()

  // Upload de imagens
  //
  // ⚠️ O `if (!error)` daqui descartava a foto EM SILÊNCIO: a ocorrência era
  // publicada sem imagem e a tela dizia "publicado com sucesso". Quem
  // fotografou um ninho uma vez perdia a evidência sem saber.
  //
  // Agora a falha aparece. Se NENHUMA das fotos anexadas subiu, jogamos o
  // erro: quem chama já tem rede de proteção para isso — a câmera manda o
  // registro para a fila offline (com o blob) e o formulário mostra o recado.
  // Falha parcial (2 de 3) publica com o que subiu, porque perder o registro
  // inteiro por causa da terceira foto seria pior.
  const imagePaths: string[] = []
  let falharam = 0
  const anexadas = dados.images?.slice(0, 3) ?? []
  for (const file of anexadas) {
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const path = `alertas/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await sb.storage.from('fotos').upload(path, file, { contentType: file.type })
    if (error) {
      falharam++
      console.error('falha ao subir foto do registro', error)
    } else {
      imagePaths.push(path)
    }
  }
  if (anexadas.length > 0 && imagePaths.length === 0) {
    throw new Error(
      falharam === 1
        ? 'Não foi possível enviar a foto. Verifique a conexão e tente de novo.'
        : 'Não foi possível enviar as fotos. Verifique a conexão e tente de novo.',
    )
  }

  const body = {
    titulo: dados.titulo,
    categoria: dados.categoria,
    tipo_registro: dados.tipoRegistro ?? 'alerta',
    status: 'identificado',
    gravidade: dados.gravidade ?? null,
    geom: `SRID=4326;POINT(${dados.lng} ${dados.lat})`,
    // Transparência total: sem coordenada embaralhada — o público vê o local
    // exato. A exceção são as categorias sensíveis (desova, filhotes), e ela
    // NÃO é decidida aqui: o gatilho `protege_local_sensivel` (migration 0063)
    // troca os dois campos por um ponto aproximado antes de gravar. Mandar o
    // exato daqui é o certo — é assim que o ponto verdadeiro chega ao cofre.
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
    comunidade_id: dados.comunidadeId ?? null,
    ocorrido_em: dados.ocorridoEm ?? null,
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
    categoria: data.categoria as CategoriaRegistro,
    tipoRegistro: (data.tipo_registro ?? 'alerta') as TipoRegistro,
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

  // Upload de novas imagens — mesma correção da publicação: falha de upload
  // não desaparece. Aqui o risco é maior, porque a edição também é o caminho
  // do "reenquadrar": a foto antiga sai de `keptImages` e a ajustada entra
  // como nova. Se a nova não subir em silêncio, o registro perde a foto que
  // tinha — a pessoa só quis mexer no corte.
  const imagePaths: string[] = dados.keptImages ? [...dados.keptImages] : []
  const novas = dados.images?.slice(0, 3 - imagePaths.length) ?? []
  let subiram = 0
  for (const file of novas) {
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
    const path = `alertas/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await sb.storage.from('fotos').upload(path, file, { contentType: file.type })
    if (error) {
      console.error('falha ao subir foto na edição do registro', error)
    } else {
      imagePaths.push(path)
      subiram++
    }
  }
  if (novas.length > 0 && subiram === 0) {
    throw new Error('Não foi possível enviar a foto. Nada foi alterado — verifique a conexão e tente de novo.')
  }

  const body: Record<string, unknown> = {
    titulo: dados.titulo,
    categoria: dados.categoria,
    gravidade: dados.gravidade ?? null,
    municipio: dados.municipio,
    uf: dados.uf.toUpperCase().slice(0, 2),
    local_nome: dados.localNome ?? null,
    descricao: dados.descricao ?? null,
    recorrente: dados.recorrente ?? false,
    images: imagePaths.length > 0 ? imagePaths : null,
  }

  if (dados.lat && dados.lng) {
    body.geom = `SRID=4326;POINT(${dados.lng} ${dados.lat})`
    // Os dois campos com o MESMO ponto, como na publicação.
    //
    // Aqui havia um ruído aleatório de ±0,005° em `geom_aprox`. Enquanto a view
    // pública servia `geom`, ninguém via; desde a 0063 ela serve
    // `coalesce(geom_aprox, geom)` — e o pino andaria uns 500 m para um lado
    // qualquer a cada vez que o autor corrigisse a descrição.
    //
    // Quem embaralha de verdade é o gatilho da 0063, e só nas categorias
    // sensíveis, com o deslocamento sempre igual para o mesmo ponto.
    body.geom_aprox = body.geom
  }

  const { error } = await sb.from('ameacas').update(body).eq('id', id).eq('denunciante_id', user.id)
  if (error) throw new Error(`Erro ao atualizar: ${error.message}`)
}

/* ─── Mutirão ─── */

export interface DadosMutirao {
  /** Comunidade que assina a publicação (admin/autor). */
  comunidadeId?: string | null
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
  /** Ocorrência (ameaça) que originou este mutirão. */
  alertaOrigemId?: string | null
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
    comunidade_id: dados.comunidadeId ?? null,
    instituicao: dados.instituicao ?? null,
    contato: dados.contato ?? null,
    vagas: dados.vagas ?? null,
    info_voluntarios: dados.infoVoluntarios ?? null,
    imagem_url: imagemUrl,
    status: dados.rascunho ? 'rascunho' : 'agendado',
    rascunho: dados.rascunho ?? false,
    descricao: dados.descricao ?? null,
    alerta_id: dados.alertaOrigemId ?? null,
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
