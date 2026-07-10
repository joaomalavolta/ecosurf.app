import { lazy, Suspense, type ComponentProps } from 'react'
import type { MapaPicker as PickerTipo } from './MapaPicker'
import type { MapaLocal as LocalTipo } from './MapaLocal'

/**
 * Versões preguiçosas do MapaPicker e MapaLocal — a outra metade da
 * correção do bundle: formulários e páginas de alerta/mutirão (estáticos no
 * App) importavam esses componentes, arrastando o MapLibre inteiro para o
 * primeiro carregamento. Os fallbacks respeitam a altura padrão de cada um
 * para não haver salto de layout enquanto o chunk do mapa chega.
 */

const PickerInterno = lazy(() => import('./MapaPicker').then((m) => ({ default: m.MapaPicker })))
const LocalInterno = lazy(() => import('./MapaLocal').then((m) => ({ default: m.MapaLocal })))

function Fallback({ height }: { height: number }) {
  return (
    <div
      aria-label="Carregando mapa"
      style={{ height, borderRadius: 14, background: '#0a1929' }}
    />
  )
}

export function MapaPickerLazy(props: ComponentProps<typeof PickerTipo>) {
  return (
    <Suspense fallback={<Fallback height={props.height ?? 200} />}>
      <PickerInterno {...props} />
    </Suspense>
  )
}

export function MapaLocalLazy(props: ComponentProps<typeof LocalTipo>) {
  return (
    <Suspense fallback={<Fallback height={props.height ?? 180} />}>
      <LocalInterno {...props} />
    </Suspense>
  )
}
