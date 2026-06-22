import { useState } from 'react'
import { IconSun, IconMoon } from '@tabler/icons-react'
import { temaAtual, aplicarTema, type Tema } from '../theme'

/** Alterna Light Ocean ↔ Dark Ocean. A preferência fica salva no aparelho. */
export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>(temaAtual())
  function definir(t: Tema) {
    aplicarTema(t)
    setTema(t)
  }
  return (
    <div className="pills" role="group" aria-label="Tema do app">
      <button className={`pill ${tema === 'light' ? 'active' : ''}`} aria-pressed={tema === 'light'} onClick={() => definir('light')}>
        <IconSun size={15} stroke={2} /> Claro
      </button>
      <button className={`pill ${tema === 'dark' ? 'active' : ''}`} aria-pressed={tema === 'dark'} onClick={() => definir('dark')}>
        <IconMoon size={15} stroke={2} /> Escuro
      </button>
    </div>
  )
}
