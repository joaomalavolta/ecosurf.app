import type { ReactNode } from 'react'
import type { Papel } from '../services/admin'

export function StatCard({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="stat">
      <div className="v">{v}</div>
      <div className="k">{k}</div>
    </div>
  )
}

const STATUS_COR: Record<string, string> = {
  aprovada: 'ok',
  pendente: 'areia',
  ocultada: 'cinza',
  rejeitada: 'alerta',
  removida: 'alerta',
  // ameaças
  identificado: 'alerta',
  'em-observacao': 'areia',
  'em-analise': 'areia',
  confirmado: 'alerta',
  recorrente: 'alerta',
  resolvido: 'ok',
  arquivado: 'cinza',
}

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COR[status] ?? 'cinza'
  // mapeia para as classes de tag existentes; "areia" reaproveita o tom neutro
  const tagCls = cls === 'areia' ? 'mar' : cls
  return <span className={`tag ${tagCls}`}>{status}</span>
}

export function RoleBadge({ papel }: { papel: Papel }) {
  const rotulo: Record<Papel, string> = {
    user: 'usuário',
    analyst: 'analista',
    moderator: 'moderador',
    admin: 'admin',
    super_admin: 'super admin',
  }
  const cls = papel === 'super_admin' || papel === 'admin' ? 'mar' : papel === 'moderator' ? 'ok' : 'cinza'
  return <span className={`tag ${cls}`}>{rotulo[papel]}</span>
}

export function ConfirmDialog({
  titulo,
  texto,
  confirmar,
  cancelar,
  onConfirmar,
  onCancelar,
  perigo,
  children,
}: {
  titulo: string
  texto?: string
  confirmar?: string
  cancelar?: string
  onConfirmar: () => void
  onCancelar: () => void
  perigo?: boolean
  children?: ReactNode
}) {
  return (
    <div className="adm-overlay" onClick={onCancelar}>
      <div className="adm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 17 }}>{titulo}</h3>
        {texto && <p className="muted" style={{ marginTop: 6 }}>{texto}</p>}
        {children}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn outline" style={{ minHeight: 40 }} onClick={onCancelar}>{cancelar ?? 'Cancelar'}</button>
          <button className="btn" style={{ minHeight: 40, background: perigo ? 'var(--perigo)' : undefined }} onClick={onConfirmar}>
            {confirmar ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Estado({ children }: { children: ReactNode }) {
  return <div className="card pad" style={{ textAlign: 'center', color: 'var(--muted)' }}>{children}</div>
}
