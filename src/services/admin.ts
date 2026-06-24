import { temBackend } from './api'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Papel = 'user' | 'analyst' | 'moderator' | 'admin' | 'super_admin'

export interface Permissoes {
  acessa: boolean // pode entrar no painel
  modera: boolean // aprovar/ocultar/soft-delete
  excluiPermanente: boolean // hard delete
  gerenciaUsuarios: boolean // mudar papel
  gerenciaPicos: boolean
  veLogs: boolean
  soLeitura: boolean // analista
}

export function permissoes(p: Papel): Permissoes {
  const staff = p === 'moderator' || p === 'admin' || p === 'super_admin'
  const adminPlus = p === 'admin' || p === 'super_admin'
  return {
    acessa: p === 'analyst' || staff,
    modera: staff,
    excluiPermanente: adminPlus,
    gerenciaUsuarios: adminPlus,
    gerenciaPicos: adminPlus,
    veLogs: adminPlus,
    soLeitura: p === 'analyst',
  }
}

let _eu: { id: string; papel: Papel; email?: string } | null = null
async function sb(): Promise<SupabaseClient> {
  return (await import('./supabase/client')).sb()
}

/** Quem sou eu e qual meu papel (gate do painel). */
export async function meuStatus(): Promise<{ id?: string; papel: Papel; email?: string }> {
  if (!temBackend()) return { papel: 'user' }
  try {
    const c = await sb()
    const { data } = await c.auth.getSession()
    const u = data.session?.user
    if (!u) return { papel: 'user' }
    const { data: p } = await c.from('perfis').select('papel').eq('id', u.id).single()
    _eu = { id: u.id, papel: (p?.papel ?? 'user') as Papel, email: u.email ?? undefined }
    return _eu
  } catch {
    return { papel: 'user' }
  }
}

/** Encerra a sessão e limpa o cache de identidade. */
export async function sair(): Promise<void> {
  try {
    const c = await sb()
    await c.auth.signOut()
  } finally {
    _eu = null
  }
}

/** Trilha de auditoria — chamada em toda ação que muda dados. */
async function log(c: SupabaseClient, acao: string, itemTipo: string, itemId: string, anterior?: unknown, novo?: unknown, motivo?: string) {
  if (!_eu) return
  await c.from('admin_logs').insert({
    admin_id: _eu.id,
    papel: _eu.papel,
    acao,
    item_tipo: itemTipo,
    item_id: itemId,
    valor_anterior: anterior ?? null,
    valor_novo: novo ?? null,
    motivo: motivo ?? null,
  })
}

// ── Dashboard ────────────────────────────────────────────────────────────
async function contar(c: SupabaseClient, tabela: string, filtro?: (q: any) => any): Promise<number> {
  let q = c.from(tabela).select('*', { count: 'exact', head: true })
  if (filtro) q = filtro(q)
  const { count } = await q
  return count ?? 0
}

export interface Indicadores {
  usuarios: number
  picos: number
  fotos: number
  fotosPendentes: number
  fotosRemovidas: number
  ameacas: number
  mutiroes: number
  bloqueados: number
  logs: number
}

export async function indicadores(): Promise<Indicadores> {
  const c = await sb()
  const [usuarios, picos, fotos, fotosPendentes, fotosRemovidas, ameacas, mutiroes, bloqueados, logs] = await Promise.all([
    contar(c, 'perfis'),
    contar(c, 'picos'),
    contar(c, 'fotos', (q) => q.is('deleted_at', null)),
    contar(c, 'fotos', (q) => q.eq('status', 'pendente')),
    contar(c, 'fotos', (q) => q.not('deleted_at', 'is', null)),
    contar(c, 'ameacas'),
    contar(c, 'mutiroes'),
    contar(c, 'perfis', (q) => q.not('bloqueado_em', 'is', null)),
    contar(c, 'admin_logs'),
  ])
  return { usuarios, picos, fotos, fotosPendentes, fotosRemovidas, ameacas, mutiroes, bloqueados, logs }
}

// ── Fotos ────────────────────────────────────────────────────────────────
export interface FotoAdmin {
  id: string
  pico_id: string
  capturada_em: string
  storage_path: string | null
  status: string
  observacao: string | null
  procedencia: string
  geofence_ok: boolean
  deleted_at: string | null
  url?: string
}

export async function listarFotos(): Promise<FotoAdmin[]> {
  const c = await sb()
  const { data } = await c
    .from('fotos')
    .select('id,pico_id,capturada_em,storage_path,status,observacao,procedencia,geofence_ok,deleted_at')
    .order('criada_em', { ascending: false })
    .limit(120)
  const fotos = (data ?? []) as FotoAdmin[]
  const paths = fotos.map((f) => f.storage_path).filter(Boolean) as string[]
  if (paths.length) {
    const { data: signed } = await c.storage.from('fotos').createSignedUrls(paths, 3600)
    const mapa = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
    fotos.forEach((f) => {
      if (f.storage_path) f.url = mapa.get(f.storage_path) ?? undefined
    })
  }
  return fotos
}

export async function moderarFoto(id: string, status: 'aprovada' | 'ocultada' | 'rejeitada' | 'pendente') {
  const c = await sb()
  await c.from('fotos').update({ status, oculta: status === 'ocultada' }).eq('id', id)
  await log(c, 'foto:status', 'foto', id, undefined, { status })
}

/** Soft-delete por padrão (status=removida + deleted_*); hard só admin+. */
export async function excluirFoto(id: string, motivo: string, opts?: { hard?: boolean; path?: string | null }) {
  const c = await sb()
  if (opts?.hard) {
    if (opts.path) await c.storage.from('fotos').remove([opts.path])
    await c.from('fotos').delete().eq('id', id)
    await log(c, 'foto:excluir-definitivo', 'foto', id, undefined, undefined, motivo)
  } else {
    await c.from('fotos').update({ status: 'removida', deleted_at: new Date().toISOString(), deleted_by: _eu?.id, delete_reason: motivo }).eq('id', id)
    await log(c, 'foto:remover', 'foto', id, undefined, { status: 'removida' }, motivo)
  }
}

export async function restaurarFoto(id: string) {
  const c = await sb()
  await c.from('fotos').update({ status: 'aprovada', deleted_at: null, delete_reason: null, oculta: false }).eq('id', id)
  await log(c, 'foto:restaurar', 'foto', id)
}

// ── Usuários ─────────────────────────────────────────────────────────────
export interface UsuarioAdmin {
  id: string
  nome: string | null
  cidade: string | null
  papel: Papel
  onboarded: boolean
  criado_em: string
  bloqueado_em: string | null
}

export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const c = await sb()
  const { data } = await c.from('perfis').select('id,nome,cidade,papel,onboarded,criado_em,bloqueado_em').order('criado_em', { ascending: false }).limit(200)
  return (data ?? []) as UsuarioAdmin[]
}

export async function definirPapel(id: string, papel: Papel) {
  const c = await sb()
  await c.from('perfis').update({ papel }).eq('id', id)
  await log(c, 'usuario:papel', 'usuario', id, undefined, { papel })
}

/** Bloqueia ou desbloqueia um usuário (impede login e contribuições). */
export async function bloquearUsuario(id: string, bloquear: boolean, motivo?: string) {
  const c = await sb()
  await c.from('perfis').update({ bloqueado_em: bloquear ? new Date().toISOString() : null }).eq('id', id)
  await log(c, bloquear ? 'usuario:bloquear' : 'usuario:desbloquear', 'usuario', id, undefined, { bloqueado: bloquear }, motivo)
}

/** Exclui permanentemente a conta de um usuário e todos os seus dados (fotos, alertas, mutirões, rascunhos). */
export async function excluirUsuario(id: string, motivo: string) {
  const c = await sb()
  // Cascata: remover dados associados (cada tabela usa nome diferente para a FK)
  await c.from('fotos').delete().eq('autor_id', id)
  await c.from('ameacas').delete().eq('denunciante_id', id)
  await c.from('mutiroes').delete().eq('organizador_id', id)
  await c.from('rascunhos').delete().eq('user_id', id)
  // Registrar antes de excluir o perfil
  await log(c, 'usuario:excluir', 'usuario', id, undefined, undefined, motivo)
  await c.from('perfis').delete().eq('id', id)
}

// ── Ameaças ──────────────────────────────────────────────────────────────
export async function listarAmeacasAdmin() {
  const c = await sb()
  const { data } = await c.from('ameacas').select('id,titulo,categoria,status,gravidade,municipio,uf,precisao').order('criada_em', { ascending: false }).limit(200)
  return (data ?? []) as { id: string; titulo: string; categoria: string; status: string; gravidade: string | null; municipio: string | null; uf: string | null; precisao: string }[]
}

export async function atualizarStatusAmeaca(id: string, status: string) {
  const c = await sb()
  await c.from('ameacas').update({ status }).eq('id', id)
  await log(c, 'alerta:status', 'alerta', id, undefined, { status })
}

export async function excluirAmeaca(id: string, motivo: string) {
  const c = await sb()
  await c.from('ameacas').delete().eq('id', id)
  await log(c, 'alerta:excluir', 'alerta', id, undefined, undefined, motivo)
}

// ── Picos ────────────────────────────────────────────────────────────────
export async function listarPicosAdmin() {
  const c = await sb()
  const { data } = await c.from('picos').select('id,nome,praia,municipio,uf,visibilidade,fundo').order('uf').limit(500)
  return (data ?? []) as { id: string; nome: string; praia: string; municipio: string | null; uf: string | null; visibilidade: string; fundo: string }[]
}

export async function definirVisibilidade(id: string, visibilidade: 'publico' | 'comunidade' | 'abafado') {
  const c = await sb()
  await c.from('picos').update({ visibilidade }).eq('id', id)
  await log(c, 'pico:visibilidade', 'pico', id, undefined, { visibilidade })
}

/** Edita campos de um pico existente. */
export async function editarPico(id: string, campos: { nome?: string; praia?: string; municipio?: string; uf?: string; fundo?: string }) {
  const c = await sb()
  await c.from('picos').update(campos).eq('id', id)
  await log(c, 'pico:editar', 'pico', id, undefined, campos)
}

/** Exclui um pico e todos os dados associados (fotos, ameaças). */
export async function excluirPico(id: string, motivo: string) {
  const c = await sb()
  await c.from('fotos').delete().eq('pico_id', id)
  await c.from('ameacas').delete().eq('pico_id', id)
  await log(c, 'pico:excluir', 'pico', id, undefined, undefined, motivo)
  await c.from('picos').delete().eq('id', id)
}

// ── Mutirões ─────────────────────────────────────────────────────────────
export interface MutiraoAdmin {
  id: string; titulo: string; tipo_acao: string | null; municipio: string | null; uf: string | null;
  quando: string; horario: string | null; organizador: string | null; status: string;
  vagas: number | null; inscritos: number | null
}

export async function listarMutiroesAdmin(): Promise<MutiraoAdmin[]> {
  const c = await sb()
  const { data } = await c.from('mutiroes').select('id,titulo,tipo_acao,municipio,uf,quando,horario,organizador,status,vagas,inscritos').order('quando', { ascending: false }).limit(200)
  return (data ?? []) as MutiraoAdmin[]
}

export async function atualizarStatusMutirao(id: string, status: string) {
  const c = await sb()
  await c.from('mutiroes').update({ status }).eq('id', id)
  await log(c, 'mutirao:status', 'mutirao', id, undefined, { status })
}

export async function excluirMutirao(id: string, motivo: string) {
  const c = await sb()
  await c.from('mutiroes').delete().eq('id', id)
  await log(c, 'mutirao:excluir', 'mutirao', id, undefined, undefined, motivo)
}

// ── Logs ─────────────────────────────────────────────────────────────────
export async function listarLogs() {
  const c = await sb()
  const { data } = await c.from('admin_logs').select('*').order('criado_em', { ascending: false }).limit(200)
  return (data ?? []) as { id: string; papel: string; acao: string; item_tipo: string; item_id: string; motivo: string | null; criado_em: string }[]
}

// ── Exportar CSV ─────────────────────────────────────────────────────────
export function baixarCSV(nome: string, linhas: Record<string, unknown>[]) {
  if (!linhas.length) return
  const cols = Object.keys(linhas[0])
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [cols.join(','), ...linhas.map((l) => cols.map((k) => esc(l[k])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${nome}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

