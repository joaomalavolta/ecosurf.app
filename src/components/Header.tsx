import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'
import { Brand } from './Brand'
import { AccountMenu } from './AccountMenu'
import { useState } from 'react'
import { IconSun, IconMoon } from '@tabler/icons-react'
import { temaAtual, aplicarTema } from '../theme'

/** Sol/lua num toque — atalho de tema para o portal desktop. */
function TemaRapido() {
  const [tema, setTema] = useState(temaAtual())
  return (
    <button
      aria-label={tema === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      onClick={() => { const t = tema === 'dark' ? 'light' : 'dark'; aplicarTema(t); setTema(t) }}
      style={{
        width: 34, height: 34, borderRadius: 12, border: 0, cursor: 'pointer',
        background: 'rgba(255,255,255,.18)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {tema === 'dark' ? <IconSun size={17} stroke={2} /> : <IconMoon size={17} stroke={2} />}
    </button>
  )
}

export function Header({
  title,
  sub,
  brand,
  children,
}: {
  title?: string
  sub?: string
  brand?: boolean
  children?: ReactNode
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const showBack = !brand && pathname !== '/'

  return (
    <header
      className="header"
      style={brand ? { textAlign: 'center' } : undefined}
    >
      {/* Menu de conta — sempre presente no topo direito */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 18px)', right: 14, zIndex: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span className="so-desktop"><TemaRapido /></span>
        <AccountMenu />
      </div>
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 18px)',
            left: 14,
            zIndex: 2,
            background: 'rgba(255,255,255,.15)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,.25)',
            borderRadius: '50%',
            width: 38,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <IconArrowLeft size={20} stroke={2} />
        </button>
      )}
      {brand ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Brand height={26} />
        </div>
      ) : (
        <h1 style={showBack ? { paddingLeft: 56 } : undefined}>{title}</h1>
      )}
      {sub && <div className="sub" style={showBack ? { paddingLeft: 56 } : undefined}>{sub}</div>}
      {children}
    </header>
  )
}
