import { db, type AlertaPendente } from './db'

/**
 * Fila offline de alertas ambientais — a promessa do manual, cumprida
 * também para denúncias: na praia sem sinal, o alerta entra aqui (foto
 * inclusa, como Blob no IndexedDB) e é publicado sozinho quando a conexão
 * voltar. Espelha a fila de fotos; erro de autenticação bloqueia em vez de
 * retentar para sempre.
 */

function ehErroDeAuth(msg: string): boolean {
  const lower = msg.toLowerCase()
  if (/\b(401|403)\b/.test(lower)) return true
  return ['sessão', 'anônim', 'jwt expired', 'invalid token', 'not authenticated'].some((t) => lower.includes(t))
}

export async function enfileirarAlerta(a: Omit<AlertaPendente, 'status' | 'criadoEm'>): Promise<void> {
  const d = await db()
  await d.put('alertas', { ...a, status: 'na-fila', criadoEm: Date.now() })
  void flushAlertas()
}

export async function alertasPendentes(): Promise<AlertaPendente[]> {
  const d = await db()
  return d.getAll('alertas')
}

let processando = false

export async function flushAlertas(): Promise<void> {
  if (processando || !navigator.onLine) return
  processando = true
  try {
    const d = await db()
    const fila = (await d.getAll('alertas')).filter((a) => a.status === 'na-fila')
    for (const a of fila) {
      try {
        const { publicarAlerta } = await import('../services/alertas')
        await publicarAlerta({
          titulo: a.titulo,
          categoria: a.categoria as import('../types/domain').CategoriaAlerta,
          gravidade: a.gravidade as import('../types/domain').GravidadeAlerta,
          localNome: a.localNome,
          municipio: a.municipio,
          uf: a.uf,
          lat: a.lat,
          lng: a.lng,
          checkboxAceite: true, // aceite foi dado na captura, antes de enfileirar
          images: a.blob ? [new File([a.blob], `alerta-${a.id}.webp`, { type: 'image/webp' })] : undefined,
        })
        await d.delete('alertas', a.id)
        const { toast } = await import('../lib/toast')
        toast(`Alerta da fila publicado: ${a.titulo}`, 'sucesso')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (ehErroDeAuth(msg)) {
          await d.put('alertas', { ...a, status: 'bloqueado', erro: msg })
        }
        // erro de rede: fica na fila; a próxima janela de conexão tenta de novo
      }
    }
  } finally {
    processando = false
  }
}

export function iniciarSincronizacaoAlertas(): void {
  window.addEventListener('online', () => void flushAlertas())
  void flushAlertas()
}
