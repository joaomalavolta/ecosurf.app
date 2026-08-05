import { lazy, Suspense, useEffect, useState, type ComponentProps } from 'react'
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
 *
 * Segundo passo: o chunk (~780kB) disputava banda com as fotos do feed no
 * mount. Agora ele só começa a baixar quando o navegador fica ocioso — o
 * conteúdo ganha a corrida, e o mapa aparece logo em seguida sozinho. Em
 * conexão boa o idle dispara de imediato e nada muda na prática.
 */

const MapViewInterno = lazy(() =>
  import('./MapView').then((m) => ({ default: m.MapView })),
)

type Props = ComponentProps<typeof MapViewTipo>

/** Espera o navegador respirar (com teto), para não competir com o feed. */
function usePodeCarregar(tetoMs = 1200): boolean {
  const [pode, setPode] = useState(false)
  useEffect(() => {
    let vivo = true
    const libera = () => vivo && setPode(true)
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
    }).requestIdleCallback
    if (ric) {
      const id = ric(libera, { timeout: tetoMs })
      return () => {
        vivo = false
        ;(window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback?.(id)
      }
    }
    // Safari/iOS ainda não têm requestIdleCallback: timer curto faz o papel.
    const t = setTimeout(libera, 300)
    return () => { vivo = false; clearTimeout(t) }
  }, [tetoMs])
  return pode
}

/** Fundo idêntico ao do mapa: sem salto de layout enquanto o chunk não vem. */
const Placeholder = () => (
  <div
    aria-label="Carregando mapa"
    style={{ position: 'absolute', inset: 0, background: '#0a1929' }}
  />
)

export function MapViewLazy(props: Props) {
  const pode = usePodeCarregar()
  if (!pode) return <Placeholder />
  return (
    <Suspense fallback={<Placeholder />}>
      <MapViewInterno {...props} />
    </Suspense>
  )
}
