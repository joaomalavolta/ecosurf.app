import { lazy, Suspense, type ComponentProps } from 'react'
import type { MapView as MapViewTipo } from './MapView'

/**
 * MapView preguiçoso — a correção do bundle de 1.6MB.
 *
 * O MapLibre é de longe a maior dependência do app. Importado estático pela
 * RadarPage (a Home mobile), ele inteiro entrava no primeiro carregamento:
 * o surfista no 3G da praia baixava o mapa-motor antes de ver qualquer
 * pixel. Este wrapper adia o MapLibre para um chunk próprio, carregado em
 * paralelo à primeira pintura — o feed aparece rápido e o mapa chega logo
 * atrás, sobre um fundo idêntico ao do próprio mapa (zero salto de layout).
 */

const MapViewInterno = lazy(() =>
  import('./MapView').then((m) => ({ default: m.MapView })),
)

type Props = ComponentProps<typeof MapViewTipo>

export function MapViewLazy(props: Props) {
  return (
    <Suspense
      fallback={
        <div
          aria-label="Carregando mapa"
          style={{ position: 'absolute', inset: 0, background: '#0a1929' }}
        />
      }
    >
      <MapViewInterno {...props} />
    </Suspense>
  )
}
