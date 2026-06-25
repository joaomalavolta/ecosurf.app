import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconSettings, IconAward, IconDownload, IconRosetteDiscountCheck, IconShieldCheck, IconShieldLock, IconLogout, IconMapPin, IconUsers, IconTargetArrow, IconCamera, IconPhoto } from '@tabler/icons-react'
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
  const [minhasFotos, setMinhasFotos] = useState<Array<{id: string, pico_id: string, capturada_em: string, storage_path: string | null}>>([])
  const [fotosUrls, setFotosUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    let vivo = true
    Promise.all([ehModerador(), meuStatus(), carregarPerfilAtual()]).then(([m, s, p]) => {
      if (vivo) {
        setMod(m)
        setPainel(permissoes(s.papel).acessa)
        setPerfil(p)
        setLoading(false)
        // Carregar fotos do usuário
        if (p) {
          import('../services/supabase/rest').then(({ restMinhasFotos }) =>
            restMinhasFotos().then(fotos => {
              if (vivo) setMinhasFotos(fotos)
            })
          ).catch(() => {})
        }
      }
    })
    return () => { vivo = false }
  }, [])

  // Carregar URLs assinadas das fotos
  useEffect(() => {
    if (minhasFotos.length === 0) return
    let vivo = true
    import('../services/supabase/storage').then(({ urlAssinada }) => {
      Promise.all(
        minhasFotos
          .filter(f => f.storage_path && !fotosUrls[f.id])
          .map(async f => {
            try {
              const url = await urlAssinada(f.storage_path!)
              return [f.id, url] as const
            } catch {
              return null
            }
          })
      ).then(results => {
        if (!vivo) return
        const urls: Record<string, string> = { ...fotosUrls }
        for (const r of results) {
          if (r && r[1]) urls[r[0]] = r[1]
        }
        setFotosUrls(urls)
      })
    }).catch(() => {})
    return () => { vivo = false }
  }, [minhasFotos])

  function toggleBorrar() {
    const val = !borrarFotos
    setBorrarFotos(val)
    localStorage.setItem('borrarRostos', val ? 'true' : 'false')
    alert('Preferência de privacidade salva no dispositivo.')
  }

  async function uploadAvatar(file: File) {
    try {
      // Redimensionar para max 512px
      const img = await createImageBitmap(file)
      const size = 512
      const escala = Math.min(1, size / Math.max(img.width, img.height))
      const w = Math.round(img.width * escala)
      const h = Math.round(img.height * escala)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) throw new Error('Navegador não suporta canvas')
      ctx.drawImage(img, 0, 0, w, h)
      if (typeof img.close === 'function') img.close()
      
      const blob = await new Promise<Blob>((resolve, reject) => 
        c.toBlob((b) => b ? resolve(b) : reject(new Error('Falha ao converter imagem')), 'image/webp', 0.85)
      )
      
      const { sb } = await import('../services/supabase/client')
      const { data } = await sb().auth.getSession()
      const u = data.session?.user
      if (!u) { alert('Você precisa estar logado para alterar o avatar.'); return }
      
      const path = `${u.id}/avatar.webp`
      
      // Tentar remover arquivo antigo primeiro (ignora erro se não existir)
      await sb().storage.from('avatars').remove([path]).catch(() => {})
      
      // Upload como novo arquivo
      const up = await sb().storage.from('avatars').upload(path, blob, {
        contentType: 'image/webp',
        upsert: true,
      })
      if (up.error) throw new Error(`Upload falhou: ${up.error.message}`)
      
      // Gerar URL pública com cache-bust
      const url = sb().storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now()
      
      const upd = await sb().from('perfis').update({ foto_url: url }).eq('id', u.id)
      if (upd.error) throw new Error(`Salvar perfil falhou: ${upd.error.message}`)
      
      setPerfil(p => p ? { ...p, avatarUrl: url } : p)
      alert('Avatar atualizado com sucesso!')
    } catch (e: any) {
      console.error('Avatar upload error:', e)
      alert('Erro ao enviar avatar: ' + (e?.message || 'erro desconhecido'))
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
              <Stat icon={IconMapPin} k="Picos" v={new Set(minhasFotos.map(f => f.pico_id)).size} />
              <Stat icon={IconPhoto} k="Fotos" v={minhasFotos.length} />
              <Stat icon={IconTargetArrow} k="Precisão" v="—" />
            </div>

            <NomeCard defaultNome={perfil.nome || ''} defaultAvatar={perfil.avatarUrl || ''} />

            {/* Minhas publicações */}
            <div className="card pad">
              <span className="eyebrow"><IconPhoto size={14} stroke={2} style={{ verticalAlign: -2, marginRight: 4 }} />Minhas publicações ({minhasFotos.length})</span>
              {minhasFotos.length === 0 ? (
                <p className="muted" style={{ marginTop: 10, textAlign: 'center' }}>Você ainda não publicou nenhuma foto. Vá até um pico e registre as ondas!</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 }}>
                  {minhasFotos.map((f) => {
                    const thumb = fotosUrls[f.id]
                    return (
                      <a
                        key={f.id}
                        href={`/pico/${f.pico_id}`}
                        style={{ display: 'block', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: 'var(--cinza)', position: 'relative' }}
                      >
                        {thumb ? (
                          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                            <IconCamera size={20} />
                          </div>
                        )}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 4px 4px', background: 'linear-gradient(transparent, rgba(0,0,0,.6))', color: '#fff', fontSize: 10, textAlign: 'center' }}>
                          {new Date(f.capturada_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </div>
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

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
