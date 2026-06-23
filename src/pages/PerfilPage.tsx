import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconSettings, IconAward, IconDownload, IconRosetteDiscountCheck, IconShieldCheck, IconShieldLock } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { AuthCard } from '../components/AuthCard'
import { NomeCard } from '../components/NomeCard'
import { ehModerador } from '../services/moderacao'
import { meuStatus, permissoes } from '../services/admin'
import { carregarPerfilAtual, type PerfilAtual } from '../services/perfil'
import { ThemeToggle } from '../components/ThemeToggle'

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="card pad" style={{ textAlign: 'center' }}>
      <div className="muted" style={{ fontSize: 12 }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{v}</div>
    </div>
  )
}

export function PerfilPage() {
  const [perfil, setPerfil] = useState<PerfilAtual | null>(null)
  const [mod, setMod] = useState(false)
  const [painel, setPainel] = useState(false)
  useEffect(() => {
    let vivo = true
    ehModerador().then((m) => vivo && setMod(m))
    meuStatus().then((s) => vivo && setPainel(permissoes(s.papel).acessa))
    carregarPerfilAtual().then((p) => vivo && setPerfil(p))
    return () => {
      vivo = false
    }
  }, [])
  return (
    <div className="page">
      <Header title="Seu perfil" sub="Reputação e histórico na comunidade." />
      <div className="page-pad stack">
        <div className="card pad row">
          <div style={{ width: 64, height: 64, borderRadius: 22, background: 'var(--azul-medio)' }} />
          <div>
            <b style={{ fontSize: 18 }}>{perfil?.nome ?? 'Visitante'}</b>
            <div className="muted">{perfil ? `Nível: ${perfil.nivel}` : 'Entre para começar seu histórico.'}</div>
            {perfil?.telefoneValidado && (
              <span className="tag ok" style={{ marginTop: 6 }}>
                <IconRosetteDiscountCheck size={13} stroke={2.2} /> conta validada por telefone
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <Stat k="Picos" v={0} />
          <Stat k="Mutirões" v={0} />
          <Stat k="Precisão" v="—" />
        </div>

        <AuthCard />

        <NomeCard />

        <div className="card pad">
          <span className="eyebrow">Aparência</span>
          <div style={{ marginTop: 10 }}><ThemeToggle /></div>
        </div>

        <div className="card pad">
          <span className="eyebrow">Privacidade & LGPD</span>
          <div className="stack" style={{ marginTop: 10 }}>
            <label className="between">Borrar rostos nas minhas fotos <input type="checkbox" defaultChecked /></label>
            <label className="between">Esconder localização exata em denúncias <input type="checkbox" defaultChecked /></label>
            <label className="between">Aparecer como anônimo em ameaças <input type="checkbox" /></label>
          </div>
        </div>

        <div className="card pad">
          <span className="eyebrow">Conta</span>
          <div className="stack" style={{ marginTop: 10 }}>
            <div className="row"><IconSettings size={20} stroke={2} /> Preferências do app</div>
            <div className="row"><IconAward size={20} stroke={2} /> Conquistas e reputação</div>
            <div className="row"><IconDownload size={20} stroke={2} /> Exportar meus dados (GeoJSON)</div>
            {mod && (
              <Link to="/moderacao" className="row" style={{ textDecoration: 'none', color: 'var(--turq)', fontWeight: 600 }}>
                <IconShieldCheck size={20} stroke={2} /> Moderação da região
              </Link>
            )}
            {painel && (
              <Link to="/admin" className="row" style={{ textDecoration: 'none', color: 'var(--azul-abissal)', fontWeight: 600 }}>
                <IconShieldLock size={20} stroke={2} /> Painel administrativo
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
