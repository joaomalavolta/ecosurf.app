import { describe, it, expect } from 'vitest'
import { ordenarMembros, type MembroPublico } from '../../services/comunidades'

const m = (
  usuarioId: string,
  nome: string | null,
  papel: MembroPublico['papel'],
  fundador = false,
): MembroPublico => ({ usuarioId, nome, papel, fundador, fotoUrl: null, cidade: null })

describe('ordenarMembros', () => {
  it('fundador vem primeiro, mesmo com nome no fim do alfabeto', () => {
    const r = ordenarMembros([
      m('1', 'Ana', 'admin'),
      m('2', 'Zeca', 'admin', true),
    ])
    expect(r.map((x) => x.usuarioId)).toEqual(['2', '1'])
  })

  it('depois do fundador vem admin, autor e seguidor', () => {
    const r = ordenarMembros([
      m('s', 'Ana', 'seguidor'),
      m('au', 'Ana', 'autor'),
      m('ad', 'Ana', 'admin'),
    ])
    expect(r.map((x) => x.papel)).toEqual(['admin', 'autor', 'seguidor'])
  })

  it('dentro do mesmo papel, ordem alfabética respeitando acento', () => {
    const r = ordenarMembros([
      m('3', 'Ícaro', 'seguidor'),
      m('1', 'Ana', 'seguidor'),
      m('2', 'Érica', 'seguidor'),
    ])
    expect(r.map((x) => x.nome)).toEqual(['Ana', 'Érica', 'Ícaro'])
  })

  it('quem não pôs nome fica no fim, sem quebrar', () => {
    const r = ordenarMembros([m('1', null, 'seguidor'), m('2', 'Ana', 'seguidor')])
    expect(r.map((x) => x.usuarioId)).toEqual(['2', '1'])
  })

  it('não altera a lista recebida', () => {
    const original = [m('1', 'Zeca', 'seguidor'), m('2', 'Ana', 'admin')]
    ordenarMembros(original)
    expect(original.map((x) => x.usuarioId)).toEqual(['1', '2'])
  })

  it('lista vazia não quebra', () => {
    expect(ordenarMembros([])).toEqual([])
  })
})
