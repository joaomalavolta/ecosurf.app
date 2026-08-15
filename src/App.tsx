import { lazy, Suspense, useEffect, type ComponentType } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { UploadStatusBar } from './components/UploadStatusBar'
import { UpdatePrompt } from './components/UpdatePrompt'
import { OnboardingProvider } from './onboarding/OnboardingContext'
import { iniciarSincronizacao } from './offline/uploadQueue'
import { HomePage } from './pages/HomePage'
import { DesktopQRLanding } from './pages/DesktopQRLanding'
import { useEhDesktop } from './hooks/useEhDesktop'

// Só a Home (Radar) e a casca entram no bundle inicial. Todo o resto carrega
// sob demanda — mantém o Radar leve no 3G e tira o SDK do Supabase (só usado
// fora da home) do caminho crítico, num chunk compartilhado carregado quando
// alguém de fato navega para uma tela que precisa dele.
function rota<M>(carregar: () => Promise<M>, nome: keyof M) {
  return lazy(() => carregar().then((m) => ({ default: m[nome] as ComponentType })))
}

const MapaPage = rota(() => import('./pages/MapaPage'), 'MapaPage')
const PicoPage = rota(() => import('./pages/PicoPage'), 'PicoPage')
const AcoesPage = rota(() => import('./pages/AcoesPage'), 'AcoesPage')
const PerfilPage = rota(() => import('./pages/PerfilPage'), 'PerfilPage')
const ComunidadePage = rota(() => import('./pages/ComunidadePage'), 'ComunidadePage')
const CriarComunidadePage = rota(() => import('./pages/CriarComunidadePage'), 'CriarComunidadePage')
const GerenciarComunidadePage = rota(() => import('./pages/GerenciarComunidadePage'), 'GerenciarComunidadePage')
const ModeracaoPage = rota(() => import('./pages/ModeracaoPage'), 'ModeracaoPage')
const TermosPage = rota(() => import('./pages/TermosPage'), 'TermosPage')
const NovaAcaoPage = rota(() => import('./pages/NovaAcaoPage'), 'NovaAcaoPage')
const FormularioAlertaPage = rota(() => import('./pages/FormularioAlertaPage'), 'FormularioAlertaPage')
const FormularioMutiraoPage = rota(() => import('./pages/FormularioMutiraoPage'), 'FormularioMutiraoPage')
const FormularioPicoPage = rota(() => import('./pages/FormularioPicoPage'), 'FormularioPicoPage')
const MutiraoPage = rota(() => import('./pages/MutiraoPage'), 'MutiraoPage')
const ExplorarPage = rota(() => import('./pages/ExplorarPage'), 'ExplorarPage')
const UsuarioPage = rota(() => import('./pages/UsuarioPage'), 'UsuarioPage')
const SurfistasPage = rota(() => import('./pages/SurfistasPage'), 'SurfistasPage')
const MensagensPage = rota(() => import('./pages/MensagensPage'), 'MensagensPage')
const ConversaPage = rota(() => import('./pages/ConversaPage'), 'ConversaPage')
const AlertaPage = rota(() => import('./pages/AlertaPage'), 'AlertaPage')
const AdminPage = rota(() => import('./pages/AdminPage'), 'AdminPage')
const EstiloDemoPage = rota(() => import('./pages/EstiloDemoPage'), 'EstiloDemoPage')
const CapturePage = rota(() => import('./pages/CapturePage'), 'CapturePage')

const Carregando = () => (
  <div className="page page-pad"><p className="muted">Carregando…</p></div>
)

export default function App() {
  const { pathname } = useLocation()
  const ehDesktop = useEhDesktop()
  // A conversa aberta usa o rodapé para escrever — a navegação sai de cena.
  const semNav = pathname === '/capturar' || pathname === '/termos' ||
    pathname.startsWith('/nova-acao') || /^\/mensagens\/.+/.test(pathname)

  useEffect(() => {
    iniciarSincronizacao()
    import('./offline/alertaQueue').then(({ iniciarSincronizacaoAlertas }) => iniciarSincronizacaoAlertas()).catch(() => {})
  }, [])

  if (pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<div className="admin" style={{ display: 'grid', placeItems: 'center' }}><p className="muted">Carregando painel…</p></div>}>
        <AdminPage />
        <UpdatePrompt />
      </Suspense>
    )
  }

  // Desktop → sempre a landing com QR (o app é feito para o celular).
  // Admin fica de fora (acima). Abaixo de 1024px, o app segue normal.
  if (ehDesktop) {
    return (
      <>
        <DesktopQRLanding />
        <UpdatePrompt />
      </>
    )
  }

  return (
    <OnboardingProvider>
      <div className="app-shell">
        <UploadStatusBar />
        <Suspense fallback={<Carregando />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/mapa" element={<MapaPage />} />
            <Route path="/pico/:picoId" element={<PicoPage />} />
            <Route path="/acoes" element={<AcoesPage />} />
            <Route path="/perfil" element={<PerfilPage />} />
            <Route path="/comunidades/nova" element={<CriarComunidadePage />} />
            <Route path="/comunidade/:comunidadeId/gerenciar" element={<GerenciarComunidadePage />} />
            <Route path="/comunidade/:comunidadeId" element={<ComunidadePage />} />
            <Route path="/moderacao" element={<ModeracaoPage />} />
            <Route path="/capturar" element={<CapturePage />} />
            <Route path="/termos" element={<TermosPage />} />
            <Route path="/nova-acao" element={<NovaAcaoPage />} />
            <Route path="/nova-acao/alerta" element={<FormularioAlertaPage />} />
            <Route path="/explorar" element={<ExplorarPage />} />
            <Route path="/nova-acao/mutirao" element={<FormularioMutiraoPage />} />
            <Route path="/nova-acao/pico" element={<FormularioPicoPage />} />
            <Route path="/mutirao/:mutiraoId/editar" element={<FormularioMutiraoPage />} />
            <Route path="/mutirao/:mutiraoId" element={<MutiraoPage />} />
            <Route path="/alerta/:id" element={<AlertaPage />} />
            <Route path="/usuario/:userId" element={<UsuarioPage />} />
            <Route path="/surfistas" element={<SurfistasPage />} />
            <Route path="/mensagens" element={<MensagensPage />} />
            <Route path="/mensagens/:conversaId" element={<ConversaPage />} />
            {!/(^|\.)ecosurf\.app$/.test(window.location.hostname) && (
              <Route path="/estilo" element={<EstiloDemoPage />} />
            )}
          </Routes>
        </Suspense>
        {!semNav && <BottomNav />}
        <UpdatePrompt />
      </div>
    </OnboardingProvider>
  )
}
