import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AlertaPendente } from '../db'

/**
 * A fila offline é onde o registro positivo corre o maior risco de virar
 * outra coisa.
 *
 * O cenário é o real: ninho encontrado na praia, sem sinal. O registro fica
 * no IndexedDB e só é publicado quando a conexão volta — possivelmente horas
 * depois, com o app já em outra tela. Se `tipo_registro` não sobreviver a
 * essa viagem, o ninho reaparece como ALERTA: no card vermelho, na contagem
 * de problemas do painel e na notificação "Novo alerta ambiental".
 */

const enviados: Record<string, unknown>[] = []
const naFila: AlertaPendente[] = []

vi.mock('../../services/alertas', () => ({
  publicarAlerta: async (dados: Record<string, unknown>) => {
    enviados.push(dados)
    return 'id-publicado'
  },
}))

vi.mock('../db', () => ({
  db: async () => ({
    getAll: async () => naFila,
    put: async (_loja: string, v: AlertaPendente) => {
      const i = naFila.findIndex((x) => x.id === v.id)
      if (i >= 0) naFila[i] = v
      else naFila.push(v)
    },
    delete: async (_loja: string, id: string) => {
      const i = naFila.findIndex((x) => x.id === id)
      if (i >= 0) naFila.splice(i, 1)
    },
  }),
}))

vi.mock('../../lib/toast', () => ({ toast: () => {} }))

const item = (over: Partial<AlertaPendente>): AlertaPendente => ({
  id: crypto.randomUUID(),
  titulo: 'Registro',
  categoria: 'lixo-praia',
  municipio: 'Tramandaí',
  uf: 'RS',
  lat: -29.98,
  lng: -50.12,
  status: 'na-fila',
  criadoEm: Date.now(),
  ...over,
})

describe('fila offline: o que sai é o que entrou', () => {
  beforeEach(() => {
    enviados.length = 0
    naFila.length = 0
    vi.stubGlobal('navigator', { onLine: true })
  })

  it('um ninho registrado sem sinal volta como POSITIVO, não como alerta', async () => {
    naFila.push(item({
      titulo: 'Área de desova — Praia de Tramandaí',
      categoria: 'area-desova',
      tipoRegistro: 'positivo',
    }))

    const { flushAlertas } = await import('../alertaQueue')
    await flushAlertas()

    expect(enviados).toHaveLength(1)
    expect(enviados[0].tipoRegistro).toBe('positivo')
    expect(enviados[0].categoria).toBe('area-desova')
    // Sem gravidade: um ninho não tem intensidade para avaliar, e 'media'
    // aqui reapareceria como selo laranja no feed.
    expect(enviados[0].gravidade).toBeUndefined()
    expect(naFila).toHaveLength(0)
  })

  it('alerta continua alerta, com a gravidade que tinha', async () => {
    naFila.push(item({ categoria: 'esgoto', tipoRegistro: 'alerta', gravidade: 'alta' }))

    const { flushAlertas } = await import('../alertaQueue')
    await flushAlertas()

    expect(enviados[0].tipoRegistro).toBe('alerta')
    expect(enviados[0].gravidade).toBe('alta')
  })

  it('item gravado antes da 0063 (sem tipoRegistro) é publicado como alerta', async () => {
    // Quem tem a fila cheia num aparelho que não abre o app desde antes da
    // migration: o campo não existe no objeto guardado, e o default tem de
    // ser o que aquele registro sempre foi.
    naFila.push(item({ categoria: 'oleo', gravidade: 'media' }))

    const { flushAlertas } = await import('../alertaQueue')
    await flushAlertas()

    expect(enviados[0].tipoRegistro).toBe('alerta')
  })
})
