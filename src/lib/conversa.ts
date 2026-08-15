/**
 * Tempo nas conversas — formatação separada da tela para poder testar.
 *
 * Nada de Intl aqui: os rótulos são fixos em pt-BR e montados na mão, então
 * o resultado é o mesmo no celular, no teste e em qualquer runtime (sem
 * depender do ICU que vier instalado).
 */

const MIN = 60_000

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const SEMANA_CURTA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const SEMANA_LONGA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

const dd = (n: number) => String(n).padStart(2, '0')

/** Meia-noite local — a base para contar dias de calendário, não de 24h. */
function inicioDoDia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * Distância em dias de calendário: 0 = hoje, 1 = ontem, 2 = anteontem.
 * Calendário e não 24h porque "ontem às 23h" é ontem mesmo às 00h30 de hoje.
 */
export function diasAtras(iso: string, agora: Date = new Date()): number {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 0
  return Math.round((inicioDoDia(agora) - inicioDoDia(d)) / 86_400_000)
}

/** Hora do relógio, 24h: "09:07". */
export function horaMin(d: Date): string {
  return `${dd(d.getHours())}:${dd(d.getMinutes())}`
}

/**
 * Selo curto da caixa de entrada: "agora", "14:32", "ontem", "qui",
 * "12/08" ou "12/08/25". Quanto mais velho, mais grossa a unidade.
 */
export function tempoCurto(iso: string, agora: Date = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dias = diasAtras(iso, agora)
  if (dias <= 0) {
    return agora.getTime() - d.getTime() < MIN ? 'agora' : horaMin(d)
  }
  if (dias === 1) return 'ontem'
  if (dias < 7) return SEMANA_CURTA[d.getDay()]
  if (d.getFullYear() === agora.getFullYear()) return `${dd(d.getDate())}/${dd(d.getMonth() + 1)}`
  return `${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`
}

/** Divisória de dia dentro da conversa: "Hoje", "Ontem", "Quinta-feira", "12 de agosto". */
export function rotuloDia(iso: string, agora: Date = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const dias = diasAtras(iso, agora)
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return 'Ontem'
  if (dias < 7) return SEMANA_LONGA[d.getDay()]
  const base = `${d.getDate()} de ${MESES[d.getMonth()]}`
  return d.getFullYear() === agora.getFullYear() ? base : `${base} de ${d.getFullYear()}`
}

/**
 * Duas leituras trouxeram exatamente as mesmas mensagens?
 *
 * A tela reconsulta de tempos em tempos; sem isso, cada consulta trocaria a
 * lista por outra igual e o React redesenharia a conversa inteira à toa.
 */
export function mesmaLista(a: { id: string }[] | null, b: { id: string }[]): boolean {
  if (!a || a.length !== b.length) return false
  return a.every((item, i) => item.id === b[i].id)
}

export interface GrupoDia<T> {
  /** AAAA-MM-DD local — chave estável para o React. */
  chave: string
  rotulo: string
  itens: T[]
}

/**
 * Agrupa em blocos de dia preservando a ordem recebida (cronológica).
 * A conversa fica legível sem repetir a data em cada balão.
 */
export function agruparPorDia<T extends { criadaEm: string }>(
  itens: T[],
  agora: Date = new Date(),
): GrupoDia<T>[] {
  const grupos: GrupoDia<T>[] = []
  for (const item of itens) {
    const d = new Date(item.criadaEm)
    const chave = Number.isNaN(d.getTime())
      ? 'sem-data'
      : `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.chave === chave) ultimo.itens.push(item)
    else grupos.push({ chave, rotulo: rotuloDia(item.criadaEm, agora), itens: [item] })
  }
  return grupos
}
