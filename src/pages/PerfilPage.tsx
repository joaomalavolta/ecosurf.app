import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconSettings, IconAward, IconDownload, IconRosetteDiscountCheck, IconShieldCheck, IconShieldLock, IconLogout, IconMapPin, IconUsers, IconTargetArrow, IconCamera } from '@tabler/icons-react'
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

  async function uploadAvatar(file: File) {
    try {
      const bmp = await createImageBitmap(file)
      const size = 512
      const escala = Math.min(1, size / Math.max(bmp.width, bmp.height))
      const w = Math.round(bmp.width * escala)
      const h = Math.round(bmp.height * escala)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      c.getContext('2d')?.drawImage(bmp, 0, 0, w, h)
      bmp.close?.()
      const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b as Blob), 'image/webp', 0.85))
      
      const { sb } = await import('../services/supabase/client')
      const { data } = await sb().auth.getSession()
      const u = data.session?.user
      if (!u) return
      
      const path = `${u.id}/avatar.webp`
      const up = await sb().storage.from('avatars').upload(path, blob, {
        contentType: 'image/webp',
        upsert: true,
      })
      if (up.error) throw up.error
      
      const url = sb().storage.from('avatars').getPublicUrl(path).data.publicUrl
      
      await sb().from('perfis').update({ avatar_url: url }).eq('id', u.id)
      
      setPerfil(p => p ? { ...p, avatarUrl: url } : p)
      alert('Avatar atualizado com sucesso!')
    } catch (e: any) {
      alert('Erro ao enviar avatar: ' + e.message)
    }
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
            <div className="card pad" style={{ textAlign: 'center', marginBottom: 12 }}>
              <h3 style={{ marginBottom: 8 }}>Junte-se à Ecosurf</h3>
              <p className="muted" style={{ lineHeight: 1.4 }}>
                Entre para a comunidade colaborativa e tenha acesso às melhores ondas e proteção do litoral brasileiro.
              </p>
            </div>
            <AuthCard />
          </>
        )}

        {/* VIEW DO USUÁRIO LOGADO */}
        {perfil && (
          <>
            <div className="card pad row">
              <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadAvatar(f)
                }} />
                {perfil.avatarUrl ? (
                  <img src={perfil.avatarUrl} alt="Avatar" style={{ width: 64, height: 64, borderRadius: 22, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 22, background: 'var(--azul-medio)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold' }}>
                    {perfil.nome ? perfil.nome.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  <IconCamera size={14} />
                </div>
              </label>
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
