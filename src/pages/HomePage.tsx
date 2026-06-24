import { useEffect, useState } from 'react'
import { temBackend } from '../services/api'
import { RadarPage } from './RadarPage'
import { LandingPage } from './LandingPage'

/**
 * Rota `/` — decide entre LandingPage (visitante) e RadarPage (logado).
 * Visitantes não-logados veem a landing com CTA.
 * Usuários logados vão direto para o Radar.
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

  if (estado === 'loading') {
    return <div className="page" style={{ minHeight: '100dvh' }} />
  }

  return estado === 'logado' ? <RadarPage /> : <LandingPage />
}
