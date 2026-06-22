import type { ReactNode } from 'react'
import { Brand } from './Brand'

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
