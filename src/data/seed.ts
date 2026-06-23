import type { Pico, RegiaoSurf, Alerta, Mutirao } from '../types/domain'

/**
 * Seed mínimo — picos e alertas começam vazios.
 * Usuários cadastram praias/picos ao registrar fotos.
 * O app agrupa os locais pela geolocalização + nome informado.
 */

export const regioesSeed: RegiaoSurf[] = [
  { id: 'litoral-sul-sp', nome: 'Litoral Sul de SP', uf: 'SP' },
  { id: 'baixada-santista', nome: 'Baixada Santista', uf: 'SP' },
]

// Picos começam vazios — cadastrados pelos usuários via CapturePage
export const picosSeed: Pico[] = []

// Alertas começam vazios — criados pelos usuários
export const ameacasSeed: Alerta[] = []

// Mutirões começam vazios
export const mutiroesSeed: Mutirao[] = []
