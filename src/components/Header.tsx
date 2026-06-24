import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { IconArrowLeft } from '@tabler/icons-react'
import { Brand } from './Brand'
import { AccountMenu } from './AccountMenu'

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
      style={brand ? { textAlign: 'center', padding: `calc(env(safe-area-inset-top, 0px) + 14px) 18px 14px` } : undefined}
    >
      {/* Menu de conta — sempre presente no topo direito */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 18px)', right: 14, zIndex: 2 }}>
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
          <Brand height={24} />
        </div>
      ) : (
        <h1 style={showBack ? { paddingLeft: 56 } : undefined}>{title}</h1>
      )}
      {sub && <div className="sub" style={showBack ? { paddingLeft: 56 } : undefined}>{sub}</div>}
      {children}
    </header>
  )
}
