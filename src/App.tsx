import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { UploadStatusBar } from './components/UploadStatusBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { OnboardingProvider } from './onboarding/OnboardingContext'
import { iniciarSincronizacao } from './offline/uploadQueue'
import { HomePage } from './pages/HomePage'
import { PicoPage } from './pages/PicoPage'
import { AcoesPage } from './pages/AcoesPage'
import { PerfilPage } from './pages/PerfilPage'
import { CapturePage } from './pages/CapturePage'
import { ModeracaoPage } from './pages/ModeracaoPage'
import { TermosPage } from './pages/TermosPage'
import { NovaAcaoPage } from './pages/NovaAcaoPage'
import { FormularioAlertaPage } from './pages/FormularioAlertaPage'
import { FormularioMutiraoPage } from './pages/FormularioMutiraoPage'
import { FormularioPicoPage } from './pages/FormularioPicoPage'
import { MutiraoPage } from './pages/MutiraoPage'
import { UsuarioPage } from './pages/UsuarioPage'
import { AlertaPage } from './pages/AlertaPage'

// O mapa carrega o MapLibre (~pesado). Fora do caminho crítico do Radar
// (entrada diária), para o app abrir leve no 3G da praia.
const MapaPage = lazy(() => import('./pages/MapaPage').then((m) => ({ default: m.MapaPage })))

// Painel admin: isolado do app público (fora do app-shell e do onboarding) e
// fora do bundle principal — só carrega quando alguém abre /admin.
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))
const EstiloDemoPage = lazy(() => import('./pages/EstiloDemoPage').then((m) => ({ default: m.EstiloDemoPage })))

export default function App() {
  const { pathname } = useLocation()
  const semNav = pathname === '/capturar' || pathname === '/termos' || pathname.startsWith('/nova-acao')

  useEffect(() => {
    iniciarSincronizacao()
  }, [])

  if (pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<div className="admin" style={{ display: 'grid', placeItems: 'center' }}><p className="muted">Carregando painel…</p></div>}>
        <AdminPage />
        <UpdatePrompt />
      </Suspense>
    )
  }

  return (
    <OnboardingProvider>
      <div className="app-shell">
        <UploadStatusBar />
        <Routes>
        <Route path="/" element={<HomePage />} />
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
        <Route path="/termos" element={<TermosPage />} />
        <Route path="/nova-acao" element={<NovaAcaoPage />} />
        <Route path="/nova-acao/alerta" element={<FormularioAlertaPage />} />
        <Route path="/nova-acao/mutirao" element={<FormularioMutiraoPage />} />
        <Route path="/nova-acao/pico" element={<FormularioPicoPage />} />
        <Route path="/mutirao/:mutiraoId/editar" element={<FormularioMutiraoPage />} />
        <Route path="/mutirao/:mutiraoId" element={<MutiraoPage />} />
        <Route path="/alerta/:id" element={<AlertaPage />} />
        <Route path="/usuario/:userId" element={<UsuarioPage />} />
        <Route path="/estilo" element={<Suspense fallback={<div className="page page-pad"><p className="muted">Carregando…</p></div>}><EstiloDemoPage /></Suspense>} />
        </Routes>
        {!semNav && <BottomNav />}
        <UpdatePrompt />
      </div>
    </OnboardingProvider>
  )
}
