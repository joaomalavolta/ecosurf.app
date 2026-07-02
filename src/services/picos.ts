import { picosSeed, regioesSeed, ameacasSeed, mutiroesSeed } from '../data/seed'
import type { Pico, RegiaoSurf, Ameaca, Mutirao } from '../types/domain'
import { temBackend } from './api'
import { restPicos, restAmeacas, restMutiroes } from './supabase/rest'

/**
 * Acesso a dados. Com backend, lê do Supabase (REST, sem SDK); senão usa o
 * seed. Sempre cai no seed se a rede falhar — offline-first.
 */
const FAVORITOS = ['praia-do-sonho', 'praia-dos-pescadores']

export async function carregarPicos(): Promise<Pico[]> {
  if (temBackend()) {
    try {
      const picos = await restPicos()
      if (picos.length) return picos
    } catch {
      /* fallback offline */
    }
  }
  return picosSeed
}

export async function carregarPico(id: string): Promise<Pico | undefined> {
  const picos = await carregarPicos()
  return picos.find((p) => p.id === id) ?? picosSeed.find((p) => p.id === id)
}

export function ehFavorito(id: string): boolean {
  return FAVORITOS.includes(id)
}

export async function carregarAmeacas(): Promise<Ameaca[]> {
  if (temBackend()) {
    try {
      return await restAmeacas()
    } catch {
      /* fallback offline */
    }
  }
  return ameacasSeed
}

export async function carregarMutiroes(): Promise<Mutirao[]> {
  if (temBackend()) {
    try {
      const ms = await restMutiroes()
      if (ms.length) return ms
    } catch {
      /* fallback offline */
    }
  }
  return mutiroesSeed
}

export function listarRegioes(): RegiaoSurf[] {
  return regioesSeed
}

export async function carregarPicosComRelato(): Promise<string[]> {
  if (temBackend()) {
    try {
      const { restPicosComRelatoHoje } = await import('./supabase/rest')
      return await restPicosComRelatoHoje()
    } catch { /* offline/erro: cai para o seed */ }
  }
  return [] // Offline fallback
}

