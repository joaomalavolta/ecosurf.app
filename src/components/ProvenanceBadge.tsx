import { IconMapPin, IconPhoto, IconHelpCircle } from '@tabler/icons-react'
import type { Procedencia } from '../types/domain'

/**
 * Selo de procedência — núcleo do anti-fake. "no local" só quando a foto vem
 * da câmera in-app, dentro do geofence e com timestamp coerente.
 */
export function ProvenanceBadge({ p }: { p: Procedencia }) {
  if (p === 'no-local')
    return (
      <span className="tag ok">
        <IconMapPin size={13} stroke={2.2} /> no local · agora
      </span>
    )
  if (p === 'galeria')
    return (
      <span className="tag cinza">
        <IconPhoto size={13} stroke={2.2} /> da galeria
      </span>
    )
  return (
    <span className="tag cinza">
      <IconHelpCircle size={13} stroke={2.2} /> não verificado
    </span>
  )
}
