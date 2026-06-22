import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { UploadStatusBar } from './components/UploadStatusBar'
import { OnboardingProvider } from './onboarding/OnboardingContext'
import { iniciarSincronizacao } from './offline/uploadQueue'
import { RadarPage } from './pages/RadarPage'
import { PicoPage } from './pages/PicoPage'
import { AcoesPage } from './pages/AcoesPage'
import { PerfilPage } from './pages/PerfilPage'
import { CapturePage } from './pages/CapturePage'
import { ModeracaoPage } from './pages/ModeracaoPage'

// O mapa carrega o MapLibre (~pesado). Fora do caminho crítico do Radar
// (entrada diária), para o app abrir leve no 3G da praia.
const MapaPage = lazy(() => import('./pages/MapaPage').then((m) => ({ default: m.MapaPage })))

export default function App() {
  const { pathname } = useLocation()
  const semNav = pathname === '/capturar'

  useEffect(() => {
    iniciarSincronizacao()
  }, [])

  return (
    <OnboardingProvider>
      <div className="app-shell">
        <UploadStatusBar />
        <Routes>
        <Route path="/" element={<RadarPage />} />
        <Route
          path="/mapa"
          element={
            <Suspense fallback={<div className="page page-pad"><p className="muted">Carregando mapa…</p></div>}>
              <MapaPage />
            </Suspense>
          }
        />
        <Route path="/pico/:picoId" element={<PicoPage />} />
        <Route path="/acoes" element={<AcoesPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/moderacao" element={<ModeracaoPage />} />
        <Route path="/capturar" element={<CapturePage />} />
        </Routes>
        {!semNav && <BottomNav />}
      </div>
    </OnboardingProvider>
  )
}
