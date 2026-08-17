import { describe, it, expect } from 'vitest'
import {
  CATEGORIAS,
  CATEGORIAS_ALERTA,
  CATEGORIAS_POSITIVAS,
  categoriaPorId,
  categoriaSensivel,
  tipoDaCategoria,
} from '../SeletorCategoria'
import { ICONES, EXPRESSAO_ICONE, TIPOS_POSITIVO } from '../../map/pins'

/**
 * O catálogo de categorias é lido por nove telas e pelo mapa, e cada uma
 * dessas pontas tem a sua própria chance de esquecer uma categoria nova. Os
 * testes aqui existem para a próxima categoria (ninho de ave, espécie
 * ameaçada) não entrar pela metade — sem pino, fora do filtro, ou com a cor
 * do chip diferente da cor do pino.
 */

/** Nome do ícone que o mapa procura para uma categoria. */
const iconeDe = (id: string) => `ic-${id}`

/** Extrai o mapa id→ícone da expressão `match` do MapLibre. */
function mapeamentoDaExpressao(): Map<string, string> {
  // ['match', ['get','tipo'], chave1, valor1, chave2, valor2, ..., padrao]
  const corpo = (EXPRESSAO_ICONE as readonly unknown[]).slice(2, -1)
  const m = new Map<string, string>()
  for (let i = 0; i + 1 < corpo.length; i += 2) m.set(String(corpo[i]), String(corpo[i + 1]))
  return m
}

describe('catálogo de categorias', () => {
  it('id desconhecido cai em "Outro impacto", nunca numa categoria positiva', () => {
    // O fallback era o ÚLTIMO item da lista. Com os positivos no fim, uma
    // categoria removida do app viraria "Ponto de coleta seletiva" — um
    // alerta antigo apareceria como boa notícia.
    expect(categoriaPorId('categoria-que-nao-existe').id).toBe('outro')
    expect(categoriaPorId('').id).toBe('outro')
    expect(tipoDaCategoria('categoria-que-nao-existe')).toBe('alerta')
  })

  it('não repete id entre as duas famílias', () => {
    const ids = CATEGORIAS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cada categoria pertence à família que declara', () => {
    expect(CATEGORIAS_ALERTA.every((c) => c.tipo === 'alerta')).toBe(true)
    expect(CATEGORIAS_POSITIVAS.every((c) => c.tipo === 'positivo')).toBe(true)
    expect(CATEGORIAS).toHaveLength(CATEGORIAS_ALERTA.length + CATEGORIAS_POSITIVAS.length)
  })

  it('só desova e filhotes têm localização protegida', () => {
    const sensiveis = CATEGORIAS.filter((c) => c.sensivel).map((c) => c.id).sort()
    expect(sensiveis).toEqual(['area-desova', 'filhotes'])
    // Casa com `categoria_sensivel()` da migration 0063: se as duas listas
    // divergirem, a interface promete proteção que o banco não dá (ou o
    // contrário, e o mapa mostra o ponto exato de um ninho).
    expect(categoriaSensivel('area-desova')).toBe(true)
    expect(categoriaSensivel('filhotes')).toBe(true)
    expect(categoriaSensivel('fauna-avistada')).toBe(false)
    expect(categoriaSensivel('lixo-praia')).toBe(false)
  })
})

describe('categorias e o mapa', () => {
  it('toda categoria tem pino desenhado', () => {
    const semPino = CATEGORIAS.filter((c) => !ICONES[iconeDe(c.id)]).map((c) => c.id)
    expect(semPino).toEqual([])
  })

  it('toda categoria está na expressão de ícone do MapLibre', () => {
    const mapa = mapeamentoDaExpressao()
    const foraDaExpressao = CATEGORIAS.filter((c) => mapa.get(c.id) !== iconeDe(c.id)).map((c) => c.id)
    // Sem isto, a categoria nova cai no ícone padrão (o pino de pico, azul):
    // uma tartaruga apareceria no mapa como se fosse um point-break.
    expect(foraDaExpressao).toEqual([])
  })

  it('o filtro "Positivos" cobre exatamente a família positiva', () => {
    expect([...TIPOS_POSITIVO].sort()).toEqual(CATEGORIAS_POSITIVAS.map((c) => c.id).sort())
  })

  it('duas categorias nunca compartilham o mesmo desenho', () => {
    // Foi assim que "entulho" passou meses com a MESMA lixeira de
    // "lixo-praia", distinguíveis só pela cor, e que "óleo" e
    // "microplásticos" dividiram uma mira. Cor não basta: no mapa os pinos
    // aparecem a 42% do tamanho e sobre satélite, onde tom escuro contra tom
    // escuro some.
    //
    // Compara o MIOLO do SVG (o grupo com os paths), não o arquivo inteiro:
    // dois pinos de cores diferentes têm SVG diferente mesmo desenhando
    // exatamente a mesma coisa — que é justamente o caso que passava batido.
    const glifo = (svg: string) => svg.slice(svg.indexOf('<g '), svg.lastIndexOf('</g>'))
      .replace(/^<g [^>]*>/, '')

    const porGlifo = new Map<string, string[]>()
    for (const c of CATEGORIAS) {
      const g = glifo(ICONES[iconeDe(c.id)])
      porGlifo.set(g, [...(porGlifo.get(g) ?? []), c.id])
    }
    const repetidos = [...porGlifo.values()].filter((ids) => ids.length > 1)
    expect(repetidos).toEqual([])
  })

  it('o pino e o chip da categoria usam a mesma cor', () => {
    // O SVG do pino traz a cor hex no `fill` do círculo. Se o catálogo mudar
    // de cor e o pino não, o mesmo registro fica de uma cor na lista e de
    // outra no mapa.
    const divergentes = CATEGORIAS
      .filter((c) => !ICONES[iconeDe(c.id)].includes(c.cor))
      .map((c) => `${c.id} (${c.cor})`)
    expect(divergentes).toEqual([])
  })
})
