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
 *
 * ── O ponto é ambíguo, e por isso decide por último ───────────────────────
 *
 * Em "1.850" o ponto separa milhar; em "1850.5" ele é decimal. Tratar todo
 * ponto como milhar parecia inofensivo até a volta da edição: o banco devolve
 * 1850.5, `String()` escreve com ponto, e a releitura virava 18505 — uma área
 * dez vezes maior a cada salvamento.
 *
 * A regra: havendo os dois sinais, o ÚLTIMO é o decimal (vale para "1.850,5"
 * e para "1,850.5"). Havendo só pontos, é milhar apenas quando os grupos são
 * de três dígitos — o formato que ninguém escreve por acaso.
 */
export function lerArea(texto: string): number | null {
  const t = texto.trim()
  if (!t) return null

  const temVirgula = t.includes(',')
  const temPonto = t.includes('.')

  let limpo: string
  if (temVirgula && temPonto) {
    const decimal = t.lastIndexOf(',') > t.lastIndexOf('.') ? ',' : '.'
    const milhar = decimal === ',' ? '.' : ','
    limpo = t.split(milhar).join('').replace(decimal, '.')
  } else if (temVirgula) {
    limpo = t.replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    limpo = t.split('.').join('')
  } else {
    limpo = t
  }

  const n = Number(limpo)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Teto do CHECK em `ameacas_area_m2_check` (migration 0070): 10 km². */
export const AREA_MAX_M2 = 10_000_000
