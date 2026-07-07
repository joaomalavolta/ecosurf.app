import { useEffect, useState, lazy, Suspense } from 'react'
import { temBackend } from '../services/api'
import { RadarPage } from './RadarPage'
import { LandingPage } from './LandingPage'
import { DesktopLandingPage } from './DesktopLandingPage'
import { gravaOnboarded } from '../onboarding/OnboardingContext'
import { useEhDesktop } from '../hooks/useEhDesktop'

// Só o DESKTOP usa o dashboard-mapa como Home (modelo ZUrb). O mobile
// permanece com a Radar como inicial — a experiência de celular não muda.
const MapaPage = lazy(() => import('./MapaPage').then((m) => ({ default: m.MapaPage })))

/**
 * Rota `/` — decide entre LandingPage (visitante) e RadarPage (logado).
 *
 * Visitante desktop → DesktopLandingPage (onda + QR: o app é feito p/ celular).
 * Visitante mobile  → LandingPage original com cadastro.
 * Logado desktop    → MapaPage (dashboard ZUrb).
 * Logado mobile     → RadarPage.
 *
 * Escuta onAuthStateChange para capturar login OAuth (Google) que chega
 * via hash na URL após redirect.
 */
export function HomePage() {
  const ehDesktop = useEhDesktop()
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
          gravaOnboarded()
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

  if (estado !== 'logado') return ehDesktop ? <DesktopLandingPage /> : <LandingPage />

  // Desktop → dashboard-mapa (ZUrb). Mobile → Radar, como sempre foi.
  return ehDesktop
    ? <Suspense fallback={<div className="page" style={{ minHeight: '100dvh' }} />}><MapaPage /></Suspense>
    : <RadarPage />
}
