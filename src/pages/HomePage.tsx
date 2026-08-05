import { useEffect, useState } from 'react'
import { temBackend } from '../services/api'
import { RadarPage } from './RadarPage'
import { LandingPage } from './LandingPage'
import { DesktopLandingPage } from './DesktopLandingPage'
import { gravaOnboarded } from '../onboarding/OnboardingContext'
import { restMinhaConta } from '../services/conta'
import { useEhDesktop } from '../hooks/useEhDesktop'

/**
 * Rota `/` — bifurca por plataforma:
 *
 * Desktop (≥1024px) → SEMPRE DesktopLandingPage (onda + QR).
 *   O app é feito para o celular; no desktop mostramos o QR para
 *   que o usuário escaneie e acesse pelo telefone. Sem exceção.
 *
 * Mobile  → LandingPage (visitante) ou RadarPage (logado).
 *
 * Escuta onAuthStateChange para capturar login OAuth (Google) que chega
 * via hash na URL após redirect.
 */
export function HomePage() {
  const ehDesktop = useEhDesktop()

  // Desktop: sempre landing com QR, logado ou não.
  if (ehDesktop) return <DesktopLandingPage />

  // ── Mobile: fluxo original (landing → radar) ──
  return <MobileHome />
}

/** Lógica de auth + roteamento usada apenas no mobile. */
function MobileHome() {
  const [estado, setEstado] = useState<'loading' | 'logado' | 'visitante'>('loading')

  useEffect(() => {
    if (!temBackend()) {
      setEstado('visitante')
      return
    }

    // Caminho comum (sem redirect de login): decide logado/visitante por REST,
    // sem carregar o SDK — o Radar abre leve. O SDK só entra quando o usuário
    // faz algo que precisa dele (login, captura, sair).
    const url = window.location.hash + window.location.search
    const ehCallbackOAuth = url.includes('access_token=') || /[?&]code=/.test(url)

    if (!ehCallbackOAuth) {
      let vivo = true
      restMinhaConta().then((c) => {
        if (!vivo) return
        if (c.id) {
          // Sessão existente (ex.: restaurada no PWA). Marca onboarded para o
          // botão da câmera abrir a captura — quem já está logado reporta.
          gravaOnboarded()
          setEstado('logado')
        } else {
          setEstado('visitante')
        }
      }).catch(() => setEstado('visitante'))
      return () => { vivo = false }
    }

    // Retorno de OAuth/magic-link: aí sim carrega o SDK para processar o token
    // na URL e reagir ao SIGNED_IN.
    let sub: { unsubscribe: () => void } | undefined
    import('../services/supabase/client').then(({ sb }) => {
      sb().auth.getSession().then(({ data }) => {
        if (data.session) {
          gravaOnboarded()
          setEstado('logado')
        } else {
          setEstado('visitante')
        }
      }).catch(() => setEstado('visitante'))

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

  return estado === 'logado' ? <RadarPage /> : <LandingPage />
}
