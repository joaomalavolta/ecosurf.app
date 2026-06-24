import { useEffect, useState } from 'react'
import { temBackend } from '../services/api'
import { RadarPage } from './RadarPage'
import { LandingPage } from './LandingPage'

/**
 * Rota `/` — decide entre LandingPage (visitante) e RadarPage (logado).
 * Expõe `isLanding` via window para o App poder esconder a BottomNav.
 */
export function HomePage() {
  const [estado, setEstado] = useState<'loading' | 'logado' | 'visitante'>('loading')

  useEffect(() => {
    if (!temBackend()) {
      setEstado('visitante')
      return
    }
    import('../services/supabase/client').then(({ sb }) => {
      sb().auth.getSession().then(({ data }) => {
        setEstado(data.session ? 'logado' : 'visitante')
      }).catch(() => setEstado('visitante'))
    }).catch(() => setEstado('visitante'))
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
