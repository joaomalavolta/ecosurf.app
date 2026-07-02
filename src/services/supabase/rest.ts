import type { Ameaca, Mutirao, Pico } from '../../types/domain'
import { SUPABASE_URL, SUPABASE_KEY, TEM_BACKEND } from './config'

/**
 * Leitura via PostgREST com fetch puro — NÃO usa o SDK, então não pesa no
 * bundle do Radar. Lê das views read-model (lat/lng já resolvidos).
 */
const BASE = SUPABASE_URL
const KEY = SUPABASE_KEY

function getLocalToken(): string | null {
  try {
    let raw = localStorage.getItem(`sb-${new URL(BASE).hostname.split('.')[0]}-auth-token`)
    if (!raw) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          raw = localStorage.getItem(k)
          break
        }
      }
    }
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const ses = parsed?.currentSession ?? parsed
    return ses?.access_token ?? null
  } catch {
    return null
  }
}

async function rest<T>(path: string): Promise<T> {
  const token = getLocalToken()
  let r = await fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${token ?? KEY}` },
    cache: 'no-store',
  })
  // Token persistido pode estar expirado: cai para leitura anônima
  // em vez de quebrar o feed (a view pública não exige sessão).
  if (!r.ok && (r.status === 401 || r.status === 403) && token) {
    r = await fetch(`${BASE}/rest/v1/${path}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      cache: 'no-store',
    })
  }
  if (!r.ok) throw new Error(`rest ${r.status}`)
  return (await r.json()) as T
}

/** Extrai o `sub` (uid) de um JWT sem libs — fallback caso a sessão não traga user.id. */
function jwtSub(token?: string): string | undefined {
  if (!token) return undefined
  try {
    let b = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    b += '='.repeat((4 - (b.length % 4)) % 4)
    return JSON.parse(atob(b))?.sub
  } catch {
    return undefined
  }
}

/**
 * Papel do usuário logado SEM carregar o SDK: lê o uid da sessão que o
 * supabase-js persiste no localStorage e consulta perfis via PostgREST.
 * Mantém o Radar leve (o painel admin é que carrega o SDK, sob demanda).
 * Usa a chave anon na leitura (papel é público) — assim não falha se o
 * access_token persistido estiver expirado.
 */
export async function restMeuPapel(): Promise<string> {
  try {
    let raw = localStorage.getItem(`sb-${new URL(BASE).hostname.split('.')[0]}-auth-token`)
    if (!raw) {
      // fallback: varre as chaves (cobre variações de ref/projeto)
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          raw = localStorage.getItem(k)
          break
        }
      }
    }
    if (!raw) return 'user'
    const parsed = JSON.parse(raw)
    const ses = parsed?.currentSession ?? parsed
    const uid: string | undefined = ses?.user?.id ?? jwtSub(ses?.access_token)
    if (!uid) return 'user'
    const r = await fetch(`${BASE}/rest/v1/perfis?select=papel&id=eq.${encodeURIComponent(uid)}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    })
    if (!r.ok) return 'user'
    const rows = (await r.json()) as { papel: string }[]
    return rows[0]?.papel ?? 'user'
  } catch {
    return 'user'
  }
}

interface PicoRow {
  id: string
  nome: string
  praia: string
  municipio: string | null
  uf: string | null
  regiao_surf_id: string | null
  lat: number
  lng: number
  orientacao_praia_deg: number
  fundo: string
  descricao: string | null
}

export async function restPicos(): Promise<Pico[]> {
  const rows = await rest<PicoRow[]>('picos_publicos?select=*&order=nome')
  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    praia: r.praia,
    municipio: r.municipio ?? '',
    uf: r.uf ?? '',
    regiaoSurfId: r.regiao_surf_id ?? '',
    lat: r.lat,
    lng: r.lng,
    orientacaoPraiaDeg: r.orientacao_praia_deg,
    fundo: r.fundo as Pico['fundo'],
    descricao: r.descricao ?? undefined,
  }))
}

interface AmeacaRow {
  id: string
  titulo: string
  categoria: string
  status: string
  gravidade: string | null
  pico_id: string | null
  municipio: string | null
  uf: string | null
  descricao: string | null
  lat: number | null
  lng: number | null
  autor_id: string | null
  autor_nome: string | null
  autor_foto: string | null
}

export async function restAmeacas(): Promise<Ameaca[]> {
  const rows = await rest<AmeacaRow[]>('ameacas_publicas?select=*')
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    categoria: r.categoria as Ameaca['categoria'],
    status: r.status as Ameaca['status'],
    gravidade: (r.gravidade ?? 'media') as Ameaca['gravidade'],
    picoId: r.pico_id ?? undefined,
    municipio: r.municipio ?? '',
    uf: r.uf ?? '',
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    descricao: r.descricao ?? undefined,
    autorId: r.autor_id ?? undefined,
    autorNome: r.autor_nome ?? undefined,
    autorFoto: r.autor_foto ?? undefined,
  }))
}

interface MutiraoRow {
  id: string
  titulo: string
  tipo_acao: string | null
  pico_id: string | null
  municipio: string | null
  uf: string | null
  quando: string
  horario: string | null
  organizador: string | null
  instituicao: string | null
  contato: string | null
  ponto_encontro: string | null
  imagem_url: string | null
  inscritos: number | null
  vagas: number | null
  info_voluntarios: string | null
  status: string
  lat: number | null
  lng: number | null
  descricao: string | null
  autor_id: string | null
  autor_nome: string | null
  autor_foto: string | null
}

/** Mutirões públicos futuros e recentes — local EXATO (mobilização aberta). */
export async function restMutiroes(): Promise<Mutirao[]> {
  const rows = await rest<MutiraoRow[]>('mutiroes_publicos?select=*&order=quando')
  return rows
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      titulo: r.titulo,
      tipoAcao: (r.tipo_acao ?? 'limpeza') as Mutirao['tipoAcao'],
      picoId: r.pico_id ?? undefined,
      municipio: r.municipio ?? '',
      uf: r.uf ?? '',
      quando: r.quando,
      horario: r.horario ?? undefined,
      organizador: r.organizador ?? undefined,
      instituicao: r.instituicao ?? undefined,
      contato: r.contato ?? undefined,
      pontoEncontro: r.ponto_encontro ?? undefined,
      imagemUrl: r.imagem_url ?? undefined,
      inscritos: r.inscritos ?? undefined,
      vagas: r.vagas ?? undefined,
      infoVoluntarios: r.info_voluntarios ?? undefined,
      status: r.status as Mutirao['status'],
      lat: r.lat as number,
      lng: r.lng as number,
      descricao: r.descricao ?? undefined,
      autorId: r.autor_id ?? undefined,
      autorNome: r.autor_nome ?? undefined,
      autorFoto: r.autor_foto ?? undefined,
    }))
}

/** Perfil público de um usuário. */
export async function restPerfilPublico(userId: string): Promise<import('../../types/domain').PerfilPublico | null> {
  const rows = await rest<{ id: string; nome: string | null; foto_url: string | null; nivel: string | null; cidade: string | null; criado_em: string }[]>(
    `perfis_publicos?id=eq.${userId}&select=*`
  )
  if (!rows.length) return null
  const r = rows[0]
  return {
    id: r.id,
    nome: r.nome,
    fotoUrl: r.foto_url,
    nivel: r.nivel,
    cidade: r.cidade,
    criadoEm: r.criado_em,
  }
}

export interface ContribsUsuario {
  fotos: { id: string; picoId: string; capturadaEm: string; thumbPath: string | null; storagePath: string | null }[]
  alertas: { id: string; titulo: string; categoria: string; municipio: string | null; uf: string | null; criadaEm: string }[]
  mutiroes: { id: string; titulo: string; tipoAcao: string | null; municipio: string | null; uf: string | null; quando: string | null }[]
  totalFotos: number
  totalAlertas: number
  totalMutiroes: number
}

/** Contribuições públicas de um usuário: fotos, alertas e mutirões que assinou. */
export async function restContribuicoesUsuario(userId: string): Promise<ContribsUsuario> {
  const uid = encodeURIComponent(userId)
  const [fotosR, alertasR, mutiroesR] = await Promise.all([
    rest<{ id: string; pico_id: string; capturada_em: string; thumb_path: string | null; storage_path: string | null }[]>(
      `fotos_publicas?autor_id=eq.${uid}&select=id,pico_id,capturada_em,thumb_path,storage_path&order=capturada_em.desc&limit=48`,
    ).catch(() => []),
    rest<{ id: string; titulo: string; categoria: string; municipio: string | null; uf: string | null; criada_em: string }[]>(
      `ameacas_publicas?autor_id=eq.${uid}&select=id,titulo,categoria,municipio,uf,criada_em&order=criada_em.desc&limit=48`,
    ).catch(() => []),
    rest<{ id: string; titulo: string; tipo_acao: string | null; municipio: string | null; uf: string | null; quando: string | null }[]>(
      `mutiroes_publicos?autor_id=eq.${uid}&select=id,titulo,tipo_acao,municipio,uf,quando&order=quando.desc&limit=48`,
    ).catch(() => []),
  ])
  return {
    fotos: fotosR.map((r) => ({ id: r.id, picoId: r.pico_id, capturadaEm: r.capturada_em, thumbPath: r.thumb_path, storagePath: r.storage_path })),
    alertas: alertasR.map((r) => ({ id: r.id, titulo: r.titulo, categoria: r.categoria, municipio: r.municipio, uf: r.uf, criadaEm: r.criada_em })),
    mutiroes: mutiroesR.map((r) => ({ id: r.id, titulo: r.titulo, tipoAcao: r.tipo_acao, municipio: r.municipio, uf: r.uf, quando: r.quando })),
    totalFotos: fotosR.length,
    totalAlertas: alertasR.length,
    totalMutiroes: mutiroesR.length,
  }
}


export interface FotoRow {
  id: string
  pico_id: string
  capturada_em: string
  storage_path: string | null
  thumb_path: string | null
  altura_mare_m: number | null
  vento_tipo: string | null
  observacao: string | null
  procedencia: string
  autor_nome: string | null
  autor_id: string | null
}

/** Fotos do pico a partir de 00:00 de hoje (o "feed do dia"), com autor_nome. */
export async function restFotosDoDia(picoId: string): Promise<FotoRow[]> {
  const cols = 'id,pico_id,capturada_em,storage_path,thumb_path,altura_mare_m,vento_tipo,observacao,procedencia,autor_nome,autor_id'
  return rest<FotoRow[]>(
    `fotos_publicas?select=${cols}&pico_id=eq.${encodeURIComponent(picoId)}` +
      `&order=capturada_em.desc&limit=30`,
  )
}

/** Últimas fotos globais da plataforma, independente do pico. */
export async function restUltimasFotosGlobais(limite = 10): Promise<FotoRow[]> {
  const cols = 'id,pico_id,capturada_em,storage_path,thumb_path,altura_mare_m,vento_tipo,observacao,procedencia,autor_nome,autor_id'
  return rest<FotoRow[]>(
    `fotos_publicas?select=${cols}&storage_path=not.is.null&order=capturada_em.desc&limit=${limite}`
  )
}

export async function restPicosComRelatoHoje(): Promise<string[]> {
  const inicio = new Date()
  inicio.setDate(inicio.getDate() - 30)
  inicio.setHours(0, 0, 0, 0)
  try {
    const rows = await rest<{ pico_id: string }[]>(
      `fotos_publicas?select=pico_id&capturada_em=gte.${encodeURIComponent(inicio.toISOString())}`
    )
    return Array.from(new Set(rows.map(r => r.pico_id)))
  } catch {
    return []
  }
}

export async function getCurtidas(fotoId: string): Promise<number> {
  if (!TEM_BACKEND) return 0
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/curtidas?foto_id=eq.${encodeURIComponent(fotoId)}`, {
      method: 'HEAD',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'count=exact' },
    })
    const count = res.headers.get('content-range')?.split('/')[1]
    return count ? parseInt(count, 10) : 0
  } catch {
    return 0
  }
}

export async function curtirFoto(fotoId: string): Promise<void> {
  if (!TEM_BACKEND) return
  const { sb } = await import('./client')
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u) throw new Error('Faça login para curtir')
  const { error } = await sb().from('curtidas').insert({ foto_id: fotoId, autor_id: u.id })
  if (error && !error.message.includes('unique constraint')) throw error
}

/** Padroniza nome em Title Case: "praia dos pescadores" → "Praia dos Pescadores" */
function titleCase(s: string): string {
  return s.trim().replace(/\s+/g, ' ').split(' ').map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ')
}

/** Gera um slug a partir do nome: "Praia dos Pescadores" → "praia-dos-pescadores" */
function slug(nome: string): string {
  return nome.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/** Insere um novo pico no Supabase (autenticado). */
export async function restInserirPico(dados: {
  nome: string
  lat: number
  lng: number
  municipio: string
  uf: string
  praia?: string
}): Promise<string> {
  if (!TEM_BACKEND) throw new Error('Backend não disponível')
  const { sb } = await import('./client')
  const nome = titleCase(dados.nome)
  const id = slug(nome)
  const body = {
    id,
    nome,
    praia: dados.praia ? titleCase(dados.praia) : nome,
    geom: `SRID=4326;POINT(${dados.lng} ${dados.lat})`,
    municipio: titleCase(dados.municipio),
    uf: dados.uf.toUpperCase().slice(0, 2),
    orientacao_praia_deg: 180,
    fundo: 'areia',
  }

  // A praia tem conexão instável (4G/5G). Uma falha de rede ("Load failed" no
  // iOS) não deve derrubar o registro — tenta de novo com espera crescente.
  let ultimoErro: unknown
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const { error } = await sb().from('picos').insert(body)
      if (error) {
        if (error.message.includes('duplicate key')) return id // pico já existe: ok
        throw new Error(error.message || 'Erro ao criar pico')
      }
      return id
    } catch (e) {
      ultimoErro = e
      const msg = e instanceof Error ? e.message : String(e)
      // Erros de rede transitórios valem retentar; erros de banco, não.
      const ehRede = /load failed|failed to fetch|network|timeout|fetch/i.test(msg)
      if (!ehRede) throw e
      if (tentativa < 2) await new Promise((r) => setTimeout(r, 800 * (tentativa + 1)))
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error('Sem conexão')
}

export interface MinhaFotoRow {
  id: string
  pico_id: string
  capturada_em: string
  storage_path: string | null
  pico_nome?: string
}

/** Todas as fotos do usuário logado (desde sempre), ordenadas por mais recente. */
export async function restMinhasFotos(): Promise<MinhaFotoRow[]> {
  if (!TEM_BACKEND) return []
  try {
    const { sb } = await import('./client')
    const { data: sess } = await sb().auth.getSession()
    const u = sess.session?.user
    if (!u) return []
    return rest<MinhaFotoRow[]>(
      `fotos?select=id,pico_id,capturada_em,storage_path&autor_id=eq.${u.id}&order=capturada_em.desc&limit=100`
    )
  } catch {
    return []
  }
}
