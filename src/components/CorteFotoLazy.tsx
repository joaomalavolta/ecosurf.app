import { lazy, Suspense, type ComponentProps } from 'react'
import type { CorteFoto as CorteTipo } from './CorteFoto'

/**
 * O corte só existe quando alguém vai enviar uma foto — não faz sentido pesar
 * o primeiro carregamento do Radar com a biblioteca de recorte. Este wrapper
 * a mantém fora do bundle principal (~84KB que o surfista no 3G não baixa até
 * precisar).
 */
const Interno = lazy(() => import('./CorteFoto').then((m) => ({ default: m.CorteFoto })))

export function CorteFoto(props: ComponentProps<typeof CorteTipo>) {
  return (
    <Suspense fallback={<div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#06222E' }} />}>
      <Interno {...props} />
    </Suspense>
  )
}
