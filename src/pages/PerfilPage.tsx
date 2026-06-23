import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconSettings, IconAward, IconDownload, IconRosetteDiscountCheck, IconShieldCheck, IconShieldLock, IconLogout, IconMapPin, IconUsers, IconTargetArrow } from '@tabler/icons-react'
import { Header } from '../components/Header'
import { AuthCard } from '../components/AuthCard'
import { NomeCard } from '../components/NomeCard'
import { ehModerador } from '../services/moderacao'
import { meuStatus, permissoes, sair } from '../services/admin'
import { carregarPerfilAtual, type PerfilAtual } from '../services/perfil'
import { ThemeToggle } from '../components/ThemeToggle'

function Stat({ k, v, icon: Icon }: { k: string; v: string | number; icon: React.ElementType }) {
  return (
    <div className="card pad" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Icon size={24} stroke={1.5} color="var(--primary)" style={{ marginBottom: 4 }} />
      <div className="muted" style={{ fontSize: 12 }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{v}</div>
    </div>
  )
}

export function PerfilPage() {
  const [perfil, setPerfil] = useState<PerfilAtual | null>(null)
  const [mod, setMod] = useState(false)
  const [painel, setPainel] = useState(false)
  const [borrarFotos, setBorrarFotos] = useState(() => localStorage.getItem('borrarRostos') !== 'false')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    Promise.all([ehModerador(), meuStatus(), carregarPerfilAtual()]).then(([m, s, p]) => {
      if (vivo) {
        setMod(m)
        setPainel(permissoes(s.papel).acessa)
        setPerfil(p)
        setLoading(false)
      }
    })
    return () => { vivo = false }
  }, [])

  function toggleBorrar() {
    const val = !borrarFotos
    setBorrarFotos(val)
    localStorage.setItem('borrarRostos', val ? 'true' : 'false')
    alert('Preferência de privacidade salva no dispositivo.')
  }

  function acaoEmBreve() {
    alert('Esta funcionalidade estará disponível na próxima atualização!')
  }

  async function fazerLogout() {
    if (confirm('Tem certeza que deseja sair?')) {
      await sair()
      window.location.reload()
    }
  }

  if (loading) {
    return (
      <div className="page">
        <Header title="Seu perfil" sub="Carregando..." />
        <div className="page-pad"><p className="muted" style={{ textAlign: 'center' }}>Aguarde...</p></div>
      </div>
    )
  }

  return (
    <div className="page">
      <Header title="Seu perfil" sub={perfil ? "Reputação e histórico na comunidade." : "Faça parte do monitoramento das ondas e da proteção dos ambientes de surf."} />
      <div className="page-pad stack">
        
        {/* VIEW DO VISITANTE */}
        {!perfil && (
          <>
            <div className="card pad" style={{ textAlign: 'center' }}>
              <h3 style={{ marginBottom: 12 }}>Junte-se à Ecosurf</h3>
              <p className="muted" style={{ lineHeight: 1.5 }}>
                Crie uma conta gratuita e junte-se à comunidade Ecosurf. Receba em tempo real informações sobre as condições das melhores ondas do Brasil e participe da proteção dos ecossistemas de surf e do oceano.
              </p>
            </div>
            <AuthCard />
          </>
        )}

        {/* VIEW DO USUÁRIO LOGADO */}
        {perfil && (
          <>
            <div className="card pad row">
              <div style={{ width: 64, height: 64, borderRadius: 22, background: 'var(--azul-medio)' }} />
              <div>
                <b style={{ fontSize: 18 }}>{perfil.nome || 'Usuário Ecosurf'}</b>
                <div className="muted">Nível: {perfil.nivel || "1 - Gota d'Água"}</div>
                {perfil.telefoneValidado && (
                  <span className="tag ok" style={{ marginTop: 6 }}>
                    <IconRosetteDiscountCheck size={13} stroke={2.2} /> conta validada por telefone
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <Stat icon={IconMapPin} k="Picos" v={0} />
              <Stat icon={IconUsers} k="Mutirões" v={0} />
              <Stat icon={IconTargetArrow} k="Precisão" v="—" />
            </div>

            <NomeCard defaultNome={perfil.nome || ''} />

            <div className="card pad">
              <span className="eyebrow">Aparência</span>
              <div style={{ marginTop: 10 }}><ThemeToggle /></div>
            </div>

            <div className="card pad">
              <span className="eyebrow">Privacidade & LGPD</span>
              <div className="stack" style={{ marginTop: 10 }}>
                <label className="between" style={{ cursor: 'pointer' }}>
                  Borrar rostos nas minhas fotos
                  <input type="checkbox" checked={borrarFotos} onChange={toggleBorrar} />
                </label>
              </div>
            </div>

            <div className="card pad">
              <span className="eyebrow">Conta</span>
              <div className="stack" style={{ marginTop: 10 }}>
                <button className="row" onClick={acaoEmBreve} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit' }}>
                  <IconSettings size={20} stroke={2} /> Preferências do app
                </button>
                <button className="row" onClick={acaoEmBreve} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit' }}>
                  <IconAward size={20} stroke={2} /> Conquistas e reputação
                </button>
                <button className="row" onClick={acaoEmBreve} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit' }}>
                  <IconDownload size={20} stroke={2} /> Exportar meus dados (GeoJSON)
                </button>
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

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button onClick={fazerLogout} className="btn" style={{ background: 'transparent', border: '1px solid var(--perigo)', color: 'var(--perigo)', fontWeight: 600 }}>
                <IconLogout size={18} /> Sair da Conta
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
