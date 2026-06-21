import { Header } from '../components/Header'
import { AuthCard } from '../components/AuthCard'
import { PERFIL_DEMO } from '../data/seed'

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="card pad" style={{ textAlign: 'center' }}>
      <div className="muted" style={{ fontSize: 12 }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{v}</div>
    </div>
  )
}

export function PerfilPage() {
  const p = PERFIL_DEMO
  return (
    <div className="page">
      <Header title="Seu perfil" sub="Reputação e histórico na comunidade." />
      <div className="page-pad stack">
        <div className="card pad row">
          <div style={{ width: 64, height: 64, borderRadius: 22, background: 'var(--mar-raso)' }} />
          <div>
            <b style={{ fontSize: 18 }}>{p.nome}</b>
            <div className="muted">Nível: {p.nivel}</div>
            {p.validadoPorTelefone && <span className="tag ok" style={{ marginTop: 6 }}>✓ conta validada por telefone</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <Stat k="Picos" v={p.picos} />
          <Stat k="Mutirões" v={p.mutiroes} />
          <Stat k="Precisão" v={`${p.precisao}%`} />
        </div>

        <div className="card pad">
          <span className="eyebrow">Privacidade & LGPD</span>
          <div className="stack" style={{ marginTop: 10 }}>
            <label className="between">Borrar rostos nas minhas fotos <input type="checkbox" defaultChecked /></label>
            <label className="between">Esconder localização exata em denúncias <input type="checkbox" defaultChecked /></label>
            <label className="between">Aparecer como anônimo em ameaças <input type="checkbox" /></label>
          </div>
        </div>

        <AuthCard />

        <div className="card pad">
          <span className="eyebrow">Conta</span>
          <div className="stack" style={{ marginTop: 10 }}>
            <div className="row">⚙️ Preferências do app</div>
            <div className="row">🏅 Conquistas e reputação</div>
            <div className="row">📤 Exportar meus dados (GeoJSON)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
