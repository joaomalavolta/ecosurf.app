import { db, type AlertaPendente } from './db'
import { arquivoDe } from '../lib/imagem'
import type { DadosAlerta } from '../services/alertas'
import type { CategoriaRegistro, GravidadeAlerta } from '../types/domain'

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

/**
 * O registro guardado vira o payload de publicação.
 *
 * Isto é uma função à parte, e exportada, por um motivo específico: ela
 * REMONTA o payload campo a campo, e o que não for nomeado aqui some — mesmo
 * estando guardado no IndexedDB, que preserva o objeto inteiro. Já aconteceu
 * duas vezes: a área da vegetação voltava da fila sem tamanho e o registro
 * perdia o crédito da comunidade que o assinou.
 *
 * Enquanto a montagem morava dentro do laço de `flushAlertas`, testar exigia
 * simular IndexedDB, rede e import dinâmico — ou seja, não se testava. Aqui é
 * um objeto entra, um objeto sai.
 */
export function payloadDaFila(a: AlertaPendente): DadosAlerta {
  return {
    titulo: a.titulo,
    categoria: a.categoria as CategoriaRegistro,
    // Sem isto, um ninho registrado sem sinal na praia voltaria da fila como
    // ALERTA — no card vermelho, na contagem de problemas do painel e na
    // notificação "Novo alerta ambiental".
    tipoRegistro: a.tipoRegistro ?? 'alerta',
    gravidade: a.gravidade as GravidadeAlerta | undefined,
    localNome: a.localNome,
    municipio: a.municipio,
    uf: a.uf,
    lat: a.lat,
    lng: a.lng,
    ocorridoEm: a.ocorridoEm,
    areaM2: a.areaM2 ?? null,
    comunidadeId: a.comunidadeId ?? undefined,
    checkboxAceite: true, // aceite foi dado na captura, antes de enfileirar
    // O blob veio do canvas e pode ser webp, jpeg ou png — o nome e o tipo
    // saem dele, nunca de um palpite. Ver lib/imagem.ts.
    images: a.blob ? [arquivoDe(a.blob, `alerta-${a.id}`)] : undefined,
  }
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
        await publicarAlerta(payloadDaFila(a))
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
