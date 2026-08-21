import type { TipoVento } from '../types/domain'

/** Menor ângulo (0..180) entre duas direções em graus. */
export function anguloEntre(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360)
  return d > 180 ? 360 - d : d
}

/**
 * Terral × maral a partir da orientação da praia.
 * - terral  = vento de terra para o mar (offshore): limpa e segura a onda. ✅
 * - maral   = vento do mar para a terra (onshore): bagunça. ❌
 * `praiaOlhaParaDeg` = direção para onde a praia olha (mar aberto).
 * O vento offshore vem da direção oposta (praia + 180°).
 *
 * Sem a orientação da praia, devolve `undefined` — e não um palpite. Terral e
 * maral só existem em relação ao lado do mar; sem ele, a mesma brisa de oeste
 * é a condição do dia em Itanhaém e vento lateral em Tramandaí. Era esse chute
 * silencioso (180° para todo pico do Brasil) que deixava o rótulo impreciso.
 *
 * Calmaria é a exceção: menos de 5 km/h é calmaria em qualquer praia, então
 * essa resposta sobrevive mesmo sem orientação.
 */
export function classificarVento(
  ventoVemDeDeg: number,
  praiaOlhaParaDeg: number | null | undefined,
  velocidadeKmh: number,
): TipoVento | undefined {
  if (velocidadeKmh < 5) return 'calmo'
  if (praiaOlhaParaDeg == null) return undefined
  const offshore = (praiaOlhaParaDeg + 180) % 360
  const d = anguloEntre(ventoVemDeDeg, offshore)
  if (d <= 60) return 'terral'
  if (d >= 120) return 'maral'
  return 'lateral'
}

export function rotuloVento(t: TipoVento): string {
  return { terral: 'terral', maral: 'maral', lateral: 'vento lateral', calmo: 'calmaria' }[t]
}

const ROSA = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO']
export function pontoCardeal(deg: number): string {
  return ROSA[Math.round((((deg % 360) + 360) % 360) / 45) % 8]
}

/**
 * Rótulo de condição combinando tamanho e qualidade do vento.
 *
 * Devolve `null` quando não dá para julgar — sem saber se o vento é terral ou
 * maral, "Clássico" e "Mexido" seriam sorteio. Nesse caso a tela mostra o que
 * é medido (altura, período, vento em km/h) em vez de uma palavra bonita.
 *
 * "Flat" sobrevive porque é só tamanho: menos de 40 cm não tem onda para o
 * vento estragar nem melhorar.
 */
export function rotularCondicao(ondaM: number, vento?: TipoVento): string | null {
  if (ondaM < 0.4) return 'Flat'
  if (!vento) return null
  if (vento === 'maral') return 'Mexido'
  if (vento === 'terral' && ondaM >= 0.8) return 'Clássico'
  if (ondaM >= 0.8) return 'Boa'
  return 'Surfável'
}

/**
 * Nota simples 0..5 para ordenar "melhores agora".
 *
 * Sem o tipo de vento, ordena por tamanho e período — que é menos informação,
 * mas informação verdadeira. O ajuste de vento simplesmente não se aplica.
 */
export function nota(ondaM: number, periodoS: number, vento?: TipoVento): number {
  let n = Math.min(3, ondaM * 2)
  if (periodoS >= 9) n += 1
  if (vento === 'terral') n += 1
  else if (vento === 'maral') n -= 1
  return Math.max(0, Math.min(5, Number(n.toFixed(1))))
}
