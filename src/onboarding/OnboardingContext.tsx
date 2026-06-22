import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { OnboardingFlow } from '../components/OnboardingFlow'

const ONBOARDED = 'ecosurf:onboarded'
const VISTO = 'ecosurf:ob_visto'

function ler(k: string): boolean {
  try {
    return localStorage.getItem(k) === '1'
  } catch {
    return false
  }
}
function grava(k: string) {
  try {
    localStorage.setItem(k, '1')
  } catch {
    /* ok */
  }
}

interface Ctx {
  onboarded: boolean
  abrir: () => void
}
const C = createContext<Ctx>({ onboarded: false, abrir: () => {} })
export const useOnboarding = () => useContext(C)

/**
 * Controla o fluxo de boas-vindas. Usa cache em localStorage para decidir
 * sem carregar o SDK do Supabase no boot (o SDK só entra quando o fluxo abre).
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useState(() => ler(ONBOARDED))
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (!ler(ONBOARDED) && !ler(VISTO)) setAberto(true) // primeira visita
  }, [])

  return (
    <C.Provider value={{ onboarded, abrir: () => setAberto(true) }}>
      {children}
      {aberto && (
        <OnboardingFlow
          onConcluir={() => {
            grava(ONBOARDED)
            grava(VISTO)
            setOnboarded(true)
            setAberto(false)
          }}
          onExplorar={() => {
            grava(VISTO)
            setAberto(false)
          }}
        />
      )}
    </C.Provider>
  )
}
