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
}
const C = createContext<Ctx>({ onboarded: false, setOnboarded: () => {}, abrir: () => {} })
export const useOnboarding = () => useContext(C)

/**
 * Controla estado de onboarding. Ao chamar abrir(), navega para a
 * LandingPage (/) que contém o fluxo de cadastro.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useState(() => ler(ONBOARDED))
  const navigate = useNavigate()

  return (
    <C.Provider value={{
      onboarded,
      setOnboarded: (v) => { if (v) gravaOnboarded(); setOnboarded(v) },
      abrir: () => navigate('/'),
    }}>
      {children}
    </C.Provider>
  )
}
