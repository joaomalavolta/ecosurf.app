import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  IconMenu2, IconLogout, IconArrowBackUp, IconArrowLeft,
} from '@tabler/icons-react'
import { temBackend } from '../services/api'
import { permissoes, meuStatus } from '../services/admin'
import * as admin from '../services/admin'
import { RoleBadge } from '../admin/ui'
import { MODULOS, TelaCheia, type Eu, type ModId } from '../admin/shared'
import { Dashboard } from '../admin/modulos/Dashboard'
import { ModuloFotos } from '../admin/modulos/ModuloFotos'
import { ModuloRegistros } from '../admin/modulos/ModuloRegistros'
import { ModuloUsuarios } from '../admin/modulos/ModuloUsuarios'
import { ModuloAmeacas } from '../admin/modulos/ModuloAmeacas'
import { ModuloPicos } from '../admin/modulos/ModuloPicos'
import { ModuloRelatorios } from '../admin/modulos/ModuloRelatorios'
import { ModuloLogs } from '../admin/modulos/ModuloLogs'
import { ModuloMutiroes } from '../admin/modulos/ModuloMutiroes'
import { ModuloConfig } from '../admin/modulos/ModuloConfig'
import { LoginAdmin } from '../admin/modulos/LoginAdmin'
import { NaoAutorizado } from '../admin/modulos/NaoAutorizado'

export function AdminPage() {
  const [eu, setEu] = useState<Eu | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<ModId>('dashboard')
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()

  const carregar = useCallback(() => {
    setCarregando(true)
    meuStatus().then((s) => { setEu(s); setCarregando(false) })
  }, [])
  useEffect(() => { carregar() }, [carregar])

  const sair = useCallback(async () => {
    await admin.sair()
    setEu({ papel: 'user' })
  }, [])

  if (!temBackend()) {
    return <TelaCheia><div className="card pad" style={{ textAlign: 'center' }}><h2 style={{ fontSize: 18 }}>Backend não configurado</h2><p className="muted" style={{ marginTop: 8 }}>O painel precisa do Supabase ativo.</p></div></TelaCheia>
  }
  if (carregando || !eu) {
    return <TelaCheia><p className="muted" style={{ textAlign: 'center' }}>Carregando painel…</p></TelaCheia>
  }
  if (!eu.id) return <LoginAdmin onEntrar={carregar} />
  const perm = permissoes(eu.papel)
  if (!perm.acessa) return <NaoAutorizado eu={eu} onSair={sair} />

  const modulos = MODULOS.filter((m) => m.pode(perm))
  const abaAtiva = modulos.some((m) => m.id === aba) ? aba : 'dashboard'

  function abrir(id: ModId) { setAba(id); setMenu(false) }

  return (
    <div className="admin">
      <header className="admin-topbar">
        <button className="ic admin-menu-btn" aria-label="Menu" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setMenu((v) => !v)}><IconMenu2 size={22} /></button>
        <button
          onClick={() => navigate('/')}
          aria-label="Voltar ao app"
          title="Voltar ao app"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
            borderRadius: 10, padding: '5px 12px', cursor: 'pointer',
            color: 'rgba(255,255,255,.85)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <IconArrowLeft size={16} stroke={2.2} /> Voltar
        </button>
        <span className="marca">Painel Ecosurf</span>
        <div style={{ flex: 1 }} />
        <span className="muted admin-email" style={{ fontSize: 12.5 }}>{eu.email}</span>
        <RoleBadge papel={eu.papel} />
        <button className="ic" aria-label="Sair" title="Sair" style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={sair}><IconLogout size={19} /></button>
      </header>

      <div className="admin-body">
        <div className={`admin-backdrop ${menu ? 'aberta' : ''}`} onClick={() => setMenu(false)} />
        <nav className={`admin-sidebar ${menu ? 'aberta' : ''}`}>
          {modulos.map((m) => (
            <button key={m.id} className={abaAtiva === m.id ? 'active' : ''} onClick={() => abrir(m.id)}>
              <m.Icone size={18} stroke={1.8} /> {m.rotulo}
            </button>
          ))}
          <Link to="/" className="row" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none', padding: '10px 12px', fontSize: 13, marginTop: 8 }}>
            <IconArrowBackUp size={16} /> Voltar ao app
          </Link>
        </nav>

        <main className="admin-main">
          {abaAtiva === 'dashboard' && <Dashboard onNavegar={abrir} />}
          {abaAtiva === 'fotos' && <ModuloFotos perm={perm} />}
          {abaAtiva === 'registros' && <ModuloRegistros />}
          {abaAtiva === 'usuarios' && <ModuloUsuarios eu={eu} perm={perm} />}
          {abaAtiva === 'ameacas' && <ModuloAmeacas perm={perm} />}
          {abaAtiva === 'picos' && <ModuloPicos perm={perm} />}
          {abaAtiva === 'relatorios' && <ModuloRelatorios />}
          {abaAtiva === 'logs' && <ModuloLogs perm={perm} />}
          {abaAtiva === 'mutiroes' && <ModuloMutiroes perm={perm} />}
          {abaAtiva === 'config' && <ModuloConfig eu={eu} onSair={sair} />}
        </main>
      </div>
    </div>
  )
}
