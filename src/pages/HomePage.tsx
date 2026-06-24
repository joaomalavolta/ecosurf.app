import { useEffect, useState } from 'react'
import { temBackend } from '../services/api'
import { RadarPage } from './RadarPage'
import { LandingPage } from './LandingPage'

/**
 * Rota `/` — decide entre LandingPage (visitante) e RadarPage (logado).
 * Escuta onAuthStateChange para capturar login OAuth (Google) que chega
 * via hash na URL após redirect.
 */
export function HomePage() {
  const [estado, setEstado] = useState<'loading' | 'logado' | 'visitante'>('loading')

  useEffect(() => {
    if (!temBackend()) {
      setEstado('visitante')
      return
    }

    let sub: { unsubscribe: () => void } | undefined

    import('../services/supabase/client').then(({ sb }) => {
      // 1. Verificar sessão existente
      sb().auth.getSession().then(({ data }) => {
        if (data.session) {
          setEstado('logado')
        } else {
          setEstado('visitante')
        }
      }).catch(() => setEstado('visitante'))

      // 2. Escutar mudanças de auth (OAuth callback via URL hash)
      const { data } = sb().auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          setEstado('logado')
        } else if (event === 'SIGNED_OUT') {
          setEstado('visitante')
        }
      })
      sub = data.subscription
    }).catch(() => setEstado('visitante'))

    return () => sub?.unsubscribe()
  }, [])

  // Signal to App.tsx whether to hide nav
  useEffect(() => {
    if (estado === 'visitante') {
      document.body.setAttribute('data-landing', '')
    } else {
      document.body.removeAttribute('data-landing')
    }
    return () => document.body.removeAttribute('data-landing')
  }, [estado])

  if (estado === 'loading') {
    return <div className="page" style={{ minHeight: '100dvh' }} />
  }

  return estado === 'logado' ? <RadarPage /> : <LandingPage />
}
