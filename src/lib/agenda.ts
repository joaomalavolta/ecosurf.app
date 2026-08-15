/**
 * Regras de agenda das ações (mutirões).
 *
 * Um mutirão fica aberto durante TODO o seu dia. O campo `horario` é texto
 * livre ("09:00 às 12:00"), então não dá para cortar na hora exata — e seria
 * ruim fechar a inscrição no meio de um evento que ainda está rolando.
 * A mesma regra vale no banco (inscrever_mutirao).
 */
export function acaoEncerrada(quando?: string | null, agora: Date = new Date()): boolean {
  if (!quando) return false
  const d = new Date(quando)
  if (Number.isNaN(d.getTime())) return false
  const diaEvento = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const diaHoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())
  return diaEvento < diaHoje
}

/** Rótulo de status já considerando a data (um "agendado" vencido é passado). */
export function rotuloStatusAcao(status?: string | null, quando?: string | null): string {
  if (status === 'cancelado') return 'Cancelado'
  if (status === 'realizado') return 'Realizado'
  if (acaoEncerrada(quando)) return 'Encerrado'
  if (status === 'agendado') return 'Agendado'
  return status ?? '—'
}
