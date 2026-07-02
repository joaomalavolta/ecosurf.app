import { describe, it, expect, beforeEach, vi } from 'vitest'

// localStorage de mentira para ambiente node
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

// O serviço importa ./api e ./supabase/client dinamicamente; sem backend
// configurado nos testes, temBackend() é falso e o sync vira no-op.
import { ehFavorito, toggleFavorito } from '../favoritos'

describe('favoritos', () => {
  beforeEach(() => store.clear())

  it('alterna e persiste no cache local', () => {
    expect(ehFavorito('pico-x')).toBe(false)
    expect(toggleFavorito('pico-x')).toBe(true)
    expect(ehFavorito('pico-x')).toBe(true)
    expect(JSON.parse(store.get('ecosurf.favoritos')!)).toContain('pico-x')
    expect(toggleFavorito('pico-x')).toBe(false)
    expect(ehFavorito('pico-x')).toBe(false)
  })

  it('mantém múltiplos picos independentes', () => {
    toggleFavorito('a')
    toggleFavorito('b')
    expect(ehFavorito('a')).toBe(true)
    expect(ehFavorito('b')).toBe(true)
    toggleFavorito('a')
    expect(ehFavorito('a')).toBe(false)
    expect(ehFavorito('b')).toBe(true)
  })
})
