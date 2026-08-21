/**
 * Área de um registro, escrita como gente lê.
 *
 * O número cru serve para o banco; para quem olha, 25000 m² não diz nada e
 * "2,5 ha" diz. O corte fica no hectare (10.000 m²) porque é a unidade em que
 * área de vegetação é discutida no Brasil — em licenciamento, em plano de
 * manejo, em reportagem. Abaixo disso, metro quadrado ainda é intuitivo:
 * dá para imaginar um quintal, uma quadra.
 *
 * Os dois aparecem juntos quando vira hectare: quem precisa do número exato
 * (pesquisa, relatório) não deve ter de reconverter.
 */
export function formatarArea(m2: number | null | undefined): string | null {
  if (m2 == null || !Number.isFinite(m2) || m2 <= 0) return null
  const metros = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(m2)
  if (m2 < 10_000) return `${metros} m²`
  const ha = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(m2 / 10_000)
  return `${ha} ha (${metros} m²)`
}

/**
 * Lê o que a pessoa digitou no campo de área.
 *
 * Aceita vírgula: num teclado brasileiro é ela que sai, e rejeitar "1850,5"
 * como inválido seria culpar o usuário pelo formato do próprio idioma.
 * Devolve `null` para vazio — que é "não informado", diferente de zero.
 */
export function lerArea(texto: string): number | null {
  const limpo = texto.trim().replace(/\./g, '').replace(',', '.')
  if (!limpo) return null
  const n = Number(limpo)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Teto do CHECK em `ameacas_area_m2_check` (migration 0070): 10 km². */
export const AREA_MAX_M2 = 10_000_000
