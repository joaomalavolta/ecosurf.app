import type { Ameaca, Mutirao, Pico } from '../../types/domain'
import { SUPABASE_URL, SUPABASE_KEY } from './config'

/**
 * Leitura via PostgREST com fetch puro — NÃO usa o SDK, então não pesa no
 * bundle do Radar. Lê das views read-model (lat/lng já resolvidos).
 */
const BASE = SUPABASE_URL
const KEY = SUPABASE_KEY

async function rest<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!r.ok) throw new Error(`rest ${r.status}`)
  return (await r.json()) as T
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
  visibilidade: string
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
    visibilidade: r.visibilidade as Pico['visibilidade'],
    descricao: r.descricao ?? undefined,
  }))
}

interface AmeacaRow {
  id: string
  titulo: string
  categoria: string
  status: string
  pico_id: string | null
  municipio: string | null
  uf: string | null
  precisao: string
  descricao: string | null
  lat: number | null
  lng: number | null
}

export async function restAmeacas(): Promise<Ameaca[]> {
  const rows = await rest<AmeacaRow[]>('ameacas_publicas?select=*')
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    categoria: r.categoria as Ameaca['categoria'],
    status: r.status as Ameaca['status'],
    picoId: r.pico_id ?? undefined,
    municipio: r.municipio ?? '',
    uf: r.uf ?? '',
    precisao: r.precisao as Ameaca['precisao'],
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    descricao: r.descricao ?? undefined,
  }))
}

interface MutiraoRow {
  id: string
  titulo: string
  pico_id: string | null
  municipio: string | null
  uf: string | null
  quando: string
  horario: string | null
  organizador: string | null
  inscritos: number | null
  vagas: number | null
  status: string
  lat: number | null
  lng: number | null
  descricao: string | null
}

/** Mutirões públicos futuros e recentes — local EXATO (mobilização aberta). */
export async function restMutiroes(): Promise<Mutirao[]> {
  const rows = await rest<MutiraoRow[]>('mutiroes_publicos?select=*&order=quando')
  return rows
    .filter((r) => r.lat != null && r.lng != null)
    .map((r) => ({
      id: r.id,
      titulo: r.titulo,
      picoId: r.pico_id ?? undefined,
      municipio: r.municipio ?? '',
      uf: r.uf ?? '',
      quando: r.quando,
      horario: r.horario ?? undefined,
      organizador: r.organizador ?? undefined,
      inscritos: r.inscritos ?? undefined,
      vagas: r.vagas ?? undefined,
      status: r.status as Mutirao['status'],
      lat: r.lat as number,
      lng: r.lng as number,
      descricao: r.descricao ?? undefined,
    }))
}

export interface FotoRow {
  id: string
  pico_id: string
  capturada_em: string
  storage_path: string | null
  altura_mare_m: number | null
  vento_tipo: string | null
  observacao: string | null
  procedencia: string
  autor_nome: string | null
}

/** Fotos do pico a partir de 00:00 de hoje (o "feed do dia"), com autor_nome. */
export async function restFotosDoDia(picoId: string): Promise<FotoRow[]> {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const cols = 'id,pico_id,capturada_em,storage_path,altura_mare_m,vento_tipo,observacao,procedencia,autor_nome'
  return rest<FotoRow[]>(
    `fotos_publicas?select=${cols}&pico_id=eq.${encodeURIComponent(picoId)}` +
      `&capturada_em=gte.${encodeURIComponent(inicio.toISOString())}&order=capturada_em.asc`,
  )
}

