import { describe, it, expect } from 'vitest'
import { diasAtras, horaMin, tempoCurto, rotuloDia, agruparPorDia, mesmaLista, semBloqueados } from '../conversa'

// Quinta-feira, 13/08/2026, 15:00 (hora local).
const agora = new Date(2026, 7, 13, 15, 0, 0)
const iso = (a: number, m: number, d: number, h = 12, min = 0) =>
  new Date(a, m - 1, d, h, min, 0).toISOString()

describe('diasAtras', () => {
  it('conta calendário, não 24h', () => {
    // 23h de ontem está a 16h de distância, mas é ontem.
    expect(diasAtras(iso(2026, 8, 12, 23), agora)).toBe(1)
    expect(diasAtras(iso(2026, 8, 13, 1), agora)).toBe(0)
  })

  it('não quebra com data inválida', () => {
    expect(diasAtras('nada disso', agora)).toBe(0)
  })
})

describe('horaMin', () => {
  it('sempre com dois dígitos', () => {
    expect(horaMin(new Date(2026, 7, 13, 9, 7))).toBe('09:07')
    expect(horaMin(new Date(2026, 7, 13, 23, 59))).toBe('23:59')
  })
})

describe('tempoCurto', () => {
  it('mensagem de segundos atrás é "agora"', () => {
    const vinteSegundos = new Date(agora.getTime() - 20_000).toISOString()
    expect(tempoCurto(vinteSegundos, agora)).toBe('agora')
  })

  it('hoje mostra a hora', () => {
    expect(tempoCurto(iso(2026, 8, 13, 9, 7), agora)).toBe('09:07')
  })

  it('ontem é "ontem"', () => {
    expect(tempoCurto(iso(2026, 8, 12, 23), agora)).toBe('ontem')
  })

  it('na mesma semana, dia da semana', () => {
    // 10/08/2026 é uma segunda.
    expect(tempoCurto(iso(2026, 8, 10), agora)).toBe('seg')
  })

  it('mais velho no ano vira dia/mês', () => {
    expect(tempoCurto(iso(2026, 3, 4), agora)).toBe('04/03')
  })

  it('de outro ano leva o ano junto', () => {
    expect(tempoCurto(iso(2025, 12, 31), agora)).toBe('31/12/25')
  })

  it('data inválida não vira "Invalid Date" na tela', () => {
    expect(tempoCurto('xx', agora)).toBe('')
  })
})

describe('rotuloDia', () => {
  it('nomeia os dias próximos', () => {
    expect(rotuloDia(iso(2026, 8, 13, 8), agora)).toBe('Hoje')
    expect(rotuloDia(iso(2026, 8, 12), agora)).toBe('Ontem')
    expect(rotuloDia(iso(2026, 8, 10), agora)).toBe('Segunda-feira')
  })

  it('mais velho usa a data por extenso', () => {
    expect(rotuloDia(iso(2026, 3, 4), agora)).toBe('4 de março')
    expect(rotuloDia(iso(2025, 12, 31), agora)).toBe('31 de dezembro de 2025')
  })
})

describe('mesmaLista', () => {
  const l = (...ids: string[]) => ids.map((id) => ({ id }))

  it('mesmas mensagens na mesma ordem', () => {
    expect(mesmaLista(l('a', 'b'), l('a', 'b'))).toBe(true)
  })

  it('chegou mensagem nova', () => {
    expect(mesmaLista(l('a'), l('a', 'b'))).toBe(false)
  })

  it('primeira carga (nada antes) sempre conta como mudança', () => {
    expect(mesmaLista(null, [])).toBe(false)
    expect(mesmaLista(null, l('a'))).toBe(false)
  })

  it('mesma quantidade, mensagem trocada', () => {
    expect(mesmaLista(l('a', 'b'), l('a', 'c'))).toBe(false)
  })
})

describe('agruparPorDia', () => {
  const m = (id: string, criadaEm: string) => ({ id, criadaEm })

  it('junta o mesmo dia e mantém a ordem', () => {
    const gs = agruparPorDia(
      [
        m('a', iso(2026, 8, 12, 9)),
        m('b', iso(2026, 8, 12, 20)),
        m('c', iso(2026, 8, 13, 8)),
      ],
      agora,
    )
    expect(gs.map((g) => g.rotulo)).toEqual(['Ontem', 'Hoje'])
    expect(gs[0].itens.map((i) => i.id)).toEqual(['a', 'b'])
    expect(gs[1].itens.map((i) => i.id)).toEqual(['c'])
  })

  it('chave é estável e única por dia', () => {
    const gs = agruparPorDia([m('a', iso(2026, 8, 12, 9))], agora)
    expect(gs[0].chave).toBe('2026-08-12')
  })

  it('lista vazia devolve nenhum grupo', () => {
    expect(agruparPorDia([], agora)).toEqual([])
  })
})

describe('semBloqueados', () => {
  const c = (id: string, outroId: string) => ({ id, outroId })

  it('tira da caixa quem foi bloqueado', () => {
    const r = semBloqueados([c('1', 'ana'), c('2', 'zeca')], new Set(['zeca']))
    expect(r.map((x) => x.id)).toEqual(['1'])
  })

  it('sem bloqueio nenhum, devolve a lista intacta', () => {
    const lista = [c('1', 'ana'), c('2', 'zeca')]
    expect(semBloqueados(lista, new Set())).toBe(lista)
  })

  it('bloquear todo mundo esvazia a caixa', () => {
    expect(semBloqueados([c('1', 'ana')], new Set(['ana']))).toEqual([])
  })

  it('conversa sem o outro lado identificado nao some', () => {
    const r = semBloqueados([c('1', '')], new Set(['ana']))
    expect(r).toHaveLength(1)
  })

  it('nao altera a lista recebida', () => {
    const lista = [c('1', 'ana'), c('2', 'zeca')]
    semBloqueados(lista, new Set(['ana']))
    expect(lista).toHaveLength(2)
  })
})
