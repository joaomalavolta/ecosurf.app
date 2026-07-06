import { useEffect, useState } from 'react'

/**
 * True quando a tela é desktop (≥1024px). Usado para bifurcar comportamento
 * que difere entre mobile e desktop — como a Home (Radar no celular, mapa
 * no desktop). O breakpoint casa com o CSS do portal.
 */
export function useEhDesktop(): boolean {
  const [ehDesktop, setEhDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const aoMudar = (e: MediaQueryListEvent) => setEhDesktop(e.matches)
    mq.addEventListener('change', aoMudar)
    return () => mq.removeEventListener('change', aoMudar)
  }, [])
  return ehDesktop
}
