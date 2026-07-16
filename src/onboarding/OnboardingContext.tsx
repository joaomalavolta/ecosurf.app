import { createContext, useContext, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

const ONBOARDED = 'ecosurf:onboarded'

function ler(k: string): boolean {
  try {
    return localStorage.getItem(k) === '1'
  } catch {
    return false
  }
}
export function gravaOnboarded() {
  try {
    localStorage.setItem(ONBOARDED, '1')
  } catch {
    /* ok */
  }
}

interface Ctx {
  onboarded: boolean
  setOnboarded: (v: boolean) => void
  abrir: () => void
  irParaCaptura: () => void
}
const C = createContext<Ctx>({ onboarded: false, setOnboarded: () => {}, abrir: () => {}, irParaCaptura: () => {} })
export const useOnboarding = () => useContext(C)

/**
 * Controla estado de onboarding. Ao chamar irParaCaptura(), abre a captura se
 * o usuário já tem sessão (mesmo que a flag 'onboarded' não exista no storage
 * do PWA); senão, leva ao onboarding na home.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useState(() => ler(ONBOARDED))
  const navigate = useNavigate()

  const irParaCaptura = async () => {
    if (onboarded) { navigate('/capturar'); return }
    // Fonte de verdade real: há sessão ativa? O PWA tem storage próprio, então
    // a flag pode faltar mesmo logado — quem tem sessão pode reportar.
    try {
      const { sb } = await import('../services/supabase/client')
      const { data } = await sb().auth.getSession()
      if (data.session) { gravaOnboarded(); setOnboarded(true); navigate('/capturar'); return }
    } catch { /* sem rede: cai no onboarding */ }
    navigate('/')
  }

  return (
    <C.Provider value={{
      onboarded,
      setOnboarded: (v) => { if (v) gravaOnboarded(); setOnboarded(v) },
      abrir: () => navigate('/'),
      irParaCaptura,
    }}>
      {children}
    </C.Provider>
  )
}
