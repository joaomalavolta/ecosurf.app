import { describe, it, expect } from 'vitest'
import { payloadDaFila } from '../alertaQueue'
import type { AlertaPendente } from '../db'

/** Um registro de vegetação enfileirado na praia, sem sinal. */
const restinga: AlertaPendente = {
  id: 'abc',
  titulo: 'Vegetação preservada ou em recuperação — Itanhaém',
  categoria: 'vegetacao-recuperacao',
  tipoRegistro: 'positivo',
  municipio: 'Itanhaém',
  uf: 'SP',
  lat: -24.192,
  lng: -46.794,
  areaM2: 1850,
  comunidadeId: 'guardioes-do-litoral',
  status: 'na-fila',
  criadoEm: 1_700_000_000_000,
}

describe('payloadDaFila', () => {
  it('a área atravessa a fila — era o que se perdia', () => {
    expect(payloadDaFila(restinga).areaM2).toBe(1850)
  })

  it('a comunidade atravessa a fila — era o outro que se perdia', () => {
    expect(payloadDaFila(restinga).comunidadeId).toBe('guardioes-do-litoral')
  })

  it('positivo continua positivo ao voltar da fila', () => {
    // Sem isto o ninho reaparece como ALERTA: card vermelho, contagem de
    // problemas do painel e notificação "Novo alerta ambiental".
    expect(payloadDaFila(restinga).tipoRegistro).toBe('positivo')
  })

  it('registro antigo, gravado antes destes campos existirem, não quebra', () => {
    // Um item que já estava na fila do aparelho antes destes campos serem
    // criados: chega sem eles, e não pode derrubar a publicação.
    const velho: AlertaPendente = {
      id: 'antigo',
      titulo: 'Lixo na praia — Santos',
      categoria: 'lixo-praia',
      municipio: 'Santos',
      uf: 'SP',
      lat: -23.97,
      lng: -46.34,
      status: 'na-fila',
      criadoEm: 1_600_000_000_000,
    }
    const p = payloadDaFila(velho)
    expect(p.areaM2).toBeNull()
    expect(p.comunidadeId).toBeUndefined()
    expect(p.tipoRegistro).toBe('alerta') // o default da coluna
  })

  it('o que foi enfileirado é o que é publicado', () => {
    // A guarda contra o modo de falha desta função: ela remonta o payload
    // campo a campo, então basta esquecer um nome para o dado sumir sem erro.
    const p = payloadDaFila(restinga)
    expect(p.titulo).toBe(restinga.titulo)
    expect(p.categoria).toBe(restinga.categoria)
    expect(p.municipio).toBe(restinga.municipio)
    expect(p.uf).toBe(restinga.uf)
    expect(p.lat).toBe(restinga.lat)
    expect(p.lng).toBe(restinga.lng)
    expect(p.checkboxAceite).toBe(true)
  })

  it('sem blob não inventa imagem', () => {
    expect(payloadDaFila(restinga).images).toBeUndefined()
  })
})
