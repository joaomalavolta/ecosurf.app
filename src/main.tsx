import { StrictMode } from 'react'
import { aplicarPreferencias, sincronizarPreferenciasDaConta } from './lib/preferencias'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { iniciarMonitorDeErros } from './lib/monitorErros'
import { iniciarPaginaEstatica } from './lib/paginaEstatica'

iniciarMonitorDeErros()
iniciarPaginaEstatica()

aplicarPreferencias()
void sincronizarPreferenciasDaConta()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
