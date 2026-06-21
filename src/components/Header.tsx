import type { ReactNode } from 'react'

export function Header({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="header">
      <h1>{title}</h1>
      {sub && <div className="sub">{sub}</div>}
      {children}
    </header>
  )
}
