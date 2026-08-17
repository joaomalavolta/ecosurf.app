import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { UploadPendente } from '../db'

/**
 * A foto que ficava presa em "enviando" para sempre.
 *
 * `flush()` grava o status 'enviando' ANTES de chamar a rede, para a barra de
 * status mostrar progresso. Se o app morre nesse intervalo — trocar de app no
 * celular, o sistema descartar a aba — o registro fica 'enviando' no
 * IndexedDB e nunca mais sai: `flush()` só recolhe 'na-fila' e 'falhou', e o
 * painel de diagnóstico nem contava isso como erro. A barra dizia
 * "enviando 1 foto…" indefinidamente.
 */

const fila: UploadPendente[] = []
const enviadas: string[] = []

vi.mock('../db', () => ({
  db: async () => ({
    getAll: async () => [...fila],
    get: async (_l: string, id: string) => fila.find((u) => u.id === id),
    put: async (_l: string, v: UploadPendente) => {
      const i = fila.findIndex((x) => x.id === v.id)
      if (i >= 0) fila[i] = { ...v }
      else fila.push({ ...v })
    },
    delete: async (_l: string, id: string) => {
      const i = fila.findIndex((x) => x.id === id)
      if (i >= 0) fila.splice(i, 1)
    },
  }),
}))

vi.mock('../../services/api', () => ({
  api: {
    enviarFoto: async (u: UploadPendente) => { enviadas.push(u.id) },
  },
}))

let n = 0
const item = (status: UploadPendente['status']): UploadPendente => ({
  id: `u${++n}`,
  picoId: 'praia-do-sonho',
  capturadaEm: new Date().toISOString(),
  status,
  criadoEm: Date.now(),
})

describe('fila de fotos: nada fica preso em "enviando"', () => {
  beforeEach(() => {
    fila.length = 0
    enviadas.length = 0
    vi.stubGlobal('navigator', { onLine: true })
  })

  it('flush sozinho IGNORA um item preso em enviando', async () => {
    // Demonstra a causa: sem a recuperação, o item nunca é tocado de novo.
    const preso = item('enviando')
    fila.push(preso)

    const { flush } = await import('../uploadQueue')
    await flush()

    expect(enviadas).toEqual([])
    expect(fila[0].status).toBe('enviando')
  })

  it('recuperarTravados devolve o preso à fila e o flush o envia', async () => {
    fila.push(item('enviando'))

    const { recuperarTravados, flush } = await import('../uploadQueue')
    const quantos = await recuperarTravados()
    expect(quantos).toBe(1)
    expect(fila[0].status).toBe('na-fila')

    await flush()
    expect(enviadas).toHaveLength(1)
    expect(fila[0].status).toBe('enviado')
  })

  it('não mexe em quem está legitimamente na fila ou já enviado', async () => {
    const naFila = item('na-fila')
    const enviado = item('enviado')
    const bloqueado = item('bloqueado')
    fila.push(naFila, enviado, bloqueado)

    const { recuperarTravados } = await import('../uploadQueue')
    expect(await recuperarTravados()).toBe(0)
    expect(fila.map((u) => u.status)).toEqual(['na-fila', 'enviado', 'bloqueado'])
  })

  it('retentarTudo também resgata o preso em enviando', async () => {
    // O botão de escape na mão do usuário: se ele está tocando aqui, a foto
    // "enviando" de vinte minutos atrás não está enviando nada.
    fila.push(item('enviando'), item('bloqueado'), item('falhou'))

    const { retentarTudo } = await import('../uploadQueue')
    await retentarTudo()

    expect(enviadas).toHaveLength(3)
    expect(fila.every((u) => u.status === 'enviado')).toBe(true)
  })
})
