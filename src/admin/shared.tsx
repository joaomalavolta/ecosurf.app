import { type ReactNode } from 'react'
import {
  IconLayoutDashboard, IconPhoto, IconClipboardList, IconUsers, IconAlertTriangle,
  IconMapPin, IconReportAnalytics, IconHistory, IconSettings,
} from '@tabler/icons-react'
import * as admin from '../services/admin'
import { type Papel, type Permissoes } from '../services/admin'

// Tipos derivados dos serviços — fonte única para todos os módulos.
export type Eu = { id?: string; papel: Papel; email?: string }
export type ModId =
  | 'dashboard' | 'fotos' | 'registros' | 'usuarios' | 'ameacas'
  | 'picos' | 'relatorios' | 'logs' | 'mutiroes' | 'config'

export type Ameaca = Awaited<ReturnType<typeof admin.listarAmeacasAdmin>>[number]
export type PicoAdm = Awaited<ReturnType<typeof admin.listarPicosAdmin>>[number]
export type LogItem = Awaited<ReturnType<typeof admin.listarLogs>>[number]

export const MODULOS: {
  id: ModId
  rotulo: string
  Icone: typeof IconPhoto
  pode: (p: Permissoes) => boolean
}[] = [
  { id: 'dashboard', rotulo: 'Painel', Icone: IconLayoutDashboard, pode: (p) => p.acessa },
  { id: 'fotos', rotulo: 'Fotos', Icone: IconPhoto, pode: (p) => p.modera },
  { id: 'registros', rotulo: 'Registros', Icone: IconClipboardList, pode: (p) => p.acessa },
  { id: 'usuarios', rotulo: 'Usuários', Icone: IconUsers, pode: (p) => p.gerenciaUsuarios },
  { id: 'ameacas', rotulo: 'Alertas', Icone: IconAlertTriangle, pode: (p) => p.modera },
  { id: 'picos', rotulo: 'Picos', Icone: IconMapPin, pode: (p) => p.gerenciaPicos },
  { id: 'relatorios', rotulo: 'Relatórios', Icone: IconReportAnalytics, pode: (p) => p.acessa },
  { id: 'logs', rotulo: 'Logs', Icone: IconHistory, pode: (p) => p.veLogs },
  { id: 'mutiroes', rotulo: 'Mutirões', Icone: IconUsers, pode: (p) => p.acessa },
  { id: 'config', rotulo: 'Configurações', Icone: IconSettings, pode: (p) => p.acessa },
]

export const fmtData = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('pt-BR') : '—'
export const fmtDataHora = (s?: string | null) =>
  s ? new Date(s).toLocaleString('pt-BR') : '—'

export function Titulo({ nome, desc, acao }: { nome: string; desc?: string; acao?: ReactNode }) {
  return (
    <div className="between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
      <div>
        <h2 style={{ fontSize: 20, color: 'var(--azul-abissal)' }}>{nome}</h2>
        {desc && <p className="muted" style={{ marginTop: 4 }}>{desc}</p>}
      </div>
      {acao}
    </div>
  )
}

export function TelaCheia({ children }: { children: ReactNode }) {
  return (
    <div className="admin" style={{ display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>{children}</div>
    </div>
  )
}
