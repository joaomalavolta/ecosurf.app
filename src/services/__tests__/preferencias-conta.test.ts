import { describe, it, expect, vi } from 'vitest'

// localStorage de mentira para ambiente node (mesmo padrão de favoritos.test)
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

// O serviço importa ./api e ./supabase/client dinamicamente; sem backend
// configurado nos testes, temBackend() é falso e o sync vira no-op — o que
// queremos aqui é validar as camadas locais (memória + cache).
import {
  lerPreferencia,
  gravarPreferencia,
  restaurarCategoria,
} from '../preferencias-conta'

describe('preferências por conta (camadas locais)', () => {
  it('devolve o padrão quando nada foi escolhido', () => {
    expect(lerPreferencia('timeline', 'soComFotos', false)).toBe(false)
    expect(lerPreferencia('aparencia', 'tema', 'light')).toBe('light')
  })

  it('grava, lê de volta e persiste no cache local', () => {
    gravarPreferencia('timeline', 'soComFotos', true)
    expect(lerPreferencia('timeline', 'soComFotos', false)).toBe(true)
    const cache = JSON.parse(store.get('ecosurf.prefs')!)
    expect(cache.timeline.soComFotos).toBe(true)
  })

  it('categorias são independentes: salvar uma não toca a outra', () => {
    gravarPreferencia('aparencia', 'textoGrande', true)
    gravarPreferencia('timeline', 'soComFotos', true)
    gravarPreferencia('aparencia', 'tema', 'dark')
    expect(lerPreferencia('timeline', 'soComFotos', false)).toBe(true)
    expect(lerPreferencia('aparencia', 'textoGrande', false)).toBe(true)
    expect(lerPreferencia('aparencia', 'tema', 'light')).toBe('dark')
  })

  it('restaurar uma categoria zera só ela', async () => {
    gravarPreferencia('aparencia', 'tema', 'dark')
    gravarPreferencia('timeline', 'soComFotos', true)
    await restaurarCategoria('aparencia')
    expect(lerPreferencia('aparencia', 'tema', 'light')).toBe('light')
    expect(lerPreferencia('timeline', 'soComFotos', false)).toBe(true)
  })
})
