import type { Procedencia } from '../types/domain'

/**
 * Selo de procedência — núcleo do anti-fake.
 * "no local" só é atribuído quando a foto vem da câmera in-app, dentro do
 * geofence do pico e com timestamp coerente (anti-foto-antiga).
 */
export function ProvenanceBadge({ p }: { p: Procedencia }) {
  if (p === 'no-local') return <span className="tag ok">📍 no local · agora</span>
  if (p === 'galeria') return <span className="tag areia">🗂️ da galeria</span>
  return <span className="tag">não verificado</span>
}
