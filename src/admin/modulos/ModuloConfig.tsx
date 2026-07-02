import {
  IconLogout,
} from '@tabler/icons-react'
import { RoleBadge } from '../ui'
import { Titulo, type Eu } from '../shared'

export function ModuloConfig({ eu, onSair }: { eu: Eu; onSair: () => void }) {
  return (
    <section className="admin-content">
      <Titulo nome="Configurações" />
      <div className="card pad stack">
        <div><span className="eyebrow">Sessão</span><div style={{ marginTop: 6 }}>{eu.email}</div></div>
        <div><span className="eyebrow">Papel</span><div style={{ marginTop: 6 }}><RoleBadge papel={eu.papel} /></div></div>
        <button className="btn outline" style={{ alignSelf: 'flex-start' }} onClick={onSair}><IconLogout size={16} /> Encerrar sessão</button>
      </div>
    </section>
  )
}

// ──────────────────────────────────────────────────────────────────── Login ──
