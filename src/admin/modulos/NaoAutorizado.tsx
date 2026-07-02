import { Link } from 'react-router-dom'
import {
  IconLogout, IconShieldLock,
} from '@tabler/icons-react'
import { TelaCheia, type Eu } from '../shared'

export function NaoAutorizado({ eu, onSair }: { eu: Eu; onSair: () => void }) {
  return (
    <TelaCheia>
      <div className="card pad stack" style={{ textAlign: 'center' }}>
        <IconShieldLock size={34} stroke={1.6} color="var(--perigo)" style={{ margin: '0 auto' }} />
        <h2 style={{ fontSize: 19, color: 'var(--azul-abissal)' }}>Acesso não autorizado</h2>
        <p className="muted">Sua conta ({eu.email}) não tem permissão para o painel. Fale com um administrador.</p>
        <button className="btn outline full" onClick={onSair}><IconLogout size={16} /> Sair</button>
        <Link to="/" className="btn full">Ir para o app</Link>
      </div>
    </TelaCheia>
  )
}

// ─────────────────────────────────────────────────────────── AdminPage (raiz) ──
