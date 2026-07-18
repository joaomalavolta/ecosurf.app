import { db, type UploadPendente } from './db'
import { api } from '../services/api'

const bus = new EventTarget()
export function onMudanca(cb: () => void): () => void {
  const h = () => cb()
  bus.addEventListener('mudou', h)
  return () => bus.removeEventListener('mudou', h)
}
function emitir() {
  bus.dispatchEvent(new Event('mudou'))
}

/** Erros que indicam falta de autenticação — não adianta retentar. */
function ehErroDeAuth(msg: string): boolean {
  const lower = msg.toLowerCase()
  // Códigos HTTP de autenticação são o sinal mais confiável…
  if (/\b(401|403)\b/.test(lower)) return true
  // …com fallback nas mensagens que o próprio app emite ao exigir login.
  const termos = ['entre com seu telefone', 'sessão', 'anônim', 'jwt expired', 'invalid token']
  return termos.some((t) => lower.includes(t))
}

/** Enfileira um upload (status inicial: na-fila) e tenta subir. */
export async function enfileirar(u: Omit<UploadPendente, 'status' | 'criadoEm'>): Promise<void> {
  const reg: UploadPendente = { ...u, status: 'na-fila', criadoEm: Date.now() }
  const d = await db()
  await d.put('uploads', reg)
  emitir()
  void flush()
}

/** Classificação vem depois da captura, sem bloquear o envio. */
export async function definirTipo(
  id: string,
  tipo: UploadPendente['tipo'],
  observacao?: string,
): Promise<void> {
  const d = await db()
  const u = await d.get('uploads', id)
  if (!u) return
  u.tipo = tipo
  if (observacao) u.observacao = observacao
  await d.put('uploads', u)
  emitir()
}

export async function pendentes(): Promise<UploadPendente[]> {
  const d = await db()
  return (await d.getAll('uploads')).sort((a, b) => a.criadoEm - b.criadoEm)
}

/** Remove da fila itens bloqueados (erro de auth) para o usuário poder recomeçar. */
export async function limparBloqueados(): Promise<void> {
  const d = await db()
  const todos = await d.getAll('uploads')
  for (const u of todos) {
    if (u.status === 'bloqueado') await d.delete('uploads', u.id)
  }
  emitir()
}

/** Remove UM envio da fila pelo id (o usuário desistiu daquele registro). */
export async function removerDaFila(id: string): Promise<void> {
  const d = await db()
  await d.delete('uploads', id)
  emitir()
}

let rodando = false
export async function flush(): Promise<void> {
  if (rodando || !navigator.onLine) return
  rodando = true
  try {
    const d = await db()
    const fila = (await d.getAll('uploads')).filter(
      (u) => u.status === 'na-fila' || u.status === 'falhou',
    )
    for (const u of fila) {
      u.status = 'enviando'
      u.erro = undefined
      await d.put('uploads', u)
      emitir()
      try {
        await api.enviarFoto(u)
        u.status = 'enviado'
        u.erro = undefined
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido'
        if (ehErroDeAuth(msg)) {
          // Erro de autenticação: não retentar (bloqueado até login)
          u.status = 'bloqueado'
          u.erro = msg
        } else if (msg.includes('PICO_DUPLICADO')) {
          // O servidor barrou um pico igual a um vizinho. Retentar não resolve
          // (vai falhar sempre): paramos a fila e mostramos o recado do banco,
          // que já vem em português e diz qual pico usar.
          u.status = 'bloqueado'
          u.erro = msg.replace(/^.*PICO_DUPLICADO:\s*/, '')
        } else {
          u.status = 'falhou'
          u.erro = msg
        }
      }
      await d.put('uploads', u)
      emitir()
    }
  } finally {
    rodando = false
  }
}

/** Liga os gatilhos de sincronização (chamado uma vez no boot). */
export function iniciarSincronizacao(): void {
  window.addEventListener('online', () => void flush())
  void flush()
  // Background Sync (progressive enhancement): com backend real, o SW
  // reenvia a fila mesmo com o app fechado.
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((reg) => (reg as unknown as { sync?: { register: (t: string) => Promise<void> } }).sync?.register('ecosurf-uploads'))
      .catch(() => {})
  }
}


/**
 * Devolve à fila tudo que estava 'bloqueado' ou 'falhou' e força um envio.
 *
 * Necessário porque 'bloqueado' não é retentado automaticamente: um registro
 * que travou por uma causa já corrigida (ex.: sessão expirada, ou o bug do
 * trigger que derrubava o INSERT) ficaria preso para sempre. Este botão de
 * escape ressuscita a fila depois que a causa raiz é resolvida.
 */
export async function retentarTudo(): Promise<void> {
  const d = await db()
  const presos = (await d.getAll('uploads')).filter(
    (u) => u.status === 'bloqueado' || u.status === 'falhou',
  )
  for (const u of presos) {
    u.status = 'na-fila'
    u.erro = undefined
    await d.put('uploads', u)
  }
  emitir()
  await flush()
}
