import type { ReactNode } from 'react'
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
  return (
    <header className="header" style={brand ? { textAlign: 'center' } : undefined}>
      {/* Menu de conta — sempre presente no topo direito */}
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 18px)', right: 14, zIndex: 2 }}>
        <AccountMenu />
      </div>
      {brand ? (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Brand height={34} />
        </div>
      ) : (
        <h1>{title}</h1>
      )}
      {sub && <div className="sub">{sub}</div>}
      {children}
    </header>
  )
}
