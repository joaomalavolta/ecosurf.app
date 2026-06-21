/**
 * Frescor da foto — "ativo agora" não é binário, decai ao longo do dia.
 * Uma foto das 6h às 16h é histórico, não condição atual. Honestidade de UX
 * e verdade de surf (a leitura do mar tem meia-vida).
 */
export type Frescor = 'ao-vivo' | 'recente' | 'esfriando' | 'historico'

export function frescor(capturadaEmISO: string, agora: Date = new Date()): Frescor {
  const horas = (agora.getTime() - new Date(capturadaEmISO).getTime()) / 3_600_000
  if (horas < 1) return 'ao-vivo'
  if (horas < 3) return 'recente'
  if (horas < 6) return 'esfriando'
  return 'historico'
}

export function rotuloFrescor(f: Frescor): string {
  return { 'ao-vivo': 'ao vivo', recente: 'recente', esfriando: 'esfriando', historico: 'histórico' }[f]
}

export function corFrescor(f: Frescor): string {
  return { 'ao-vivo': '#1F6557', recente: '#1668A6', esfriando: '#6E6AA6', historico: '#5A6B79' }[f]
}

export function horaCurta(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Hora do dia em fração (0..24) a partir de um ISO. */
export function horaDoDia(iso: string): number {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}
