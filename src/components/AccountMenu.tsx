import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconUser,
  IconRipple,
  IconShieldLock,
  IconLogout,
  IconLogin,
  IconDeviceMobile,
  IconCheck,
  IconUserCircle,
  IconChevronRight,
} from '@tabler/icons-react'
import { meuStatus, permissoes, sair, type Papel } from '../services/admin'
import { useOnboarding } from '../onboarding/OnboardingContext'

/* ── Helpers de PWA ──────────────────────────────────────────────────── */
let _deferredPrompt: BeforeInstallPromptEvent | null = null

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    _deferredPrompt = e as BeforeInstallPromptEvent
  })
}

function jaInstalado(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  )
}

/* ── Rótulo do papel ─────────────────────────────────────────────────── */
const labelPapel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  moderator: 'Moderador',
  analyst: 'Analista',
}

function corPapel(p: Papel): string {
  if (p === 'super_admin' || p === 'admin') return 'var(--amber)'
  if (p === 'moderator') return 'var(--turq)'
  if (p === 'analyst') return 'var(--aqua)'
  return ''
}

/* ── Componente ──────────────────────────────────────────────────────── */
export function AccountMenu() {
  const [aberto, setAberto] = useState(false)
  const [status, setStatus] = useState<{
    id?: string
    papel: Papel
    email?: string
    nome?: string
    avatarUrl?: string
  }>({ papel: 'user' })
  const [instalado, setInstalado] = useState(jaInstalado())
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { abrir } = useOnboarding()

  useEffect(() => {
    let vivo = true
    meuStatus().then(async (s) => {
      if (!vivo) return
      let nome: string | undefined
      let avatarUrl: string | undefined
      if (s.id) {
        try {
          const { carregarPerfilAtual } = await import('../services/perfil')
          const perfil = await carregarPerfilAtual()
          nome = perfil?.nome
          avatarUrl = perfil?.avatarUrl
        } catch { /* ignora */ }
      }
      setStatus({ ...s, nome, avatarUrl })
    })
    return () => { vivo = false }
  }, [])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [aberto])

  const logado = !!status.id
  const ehStaff = logado && status.papel !== 'user'
  const perm = permissoes(status.papel)
  const inicial = status.nome?.charAt(0).toUpperCase() ?? status.email?.charAt(0).toUpperCase() ?? '?'

  const ir = useCallback((rota: string) => {
    setAberto(false)
    navigate(rota)
  }, [navigate])

  async function handleInstalarPWA() {
    if (_deferredPrompt) {
      await _deferredPrompt.prompt()
      const { outcome } = await _deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalado(true)
      _deferredPrompt = null
    }
  }

  async function handleSair() {
    await sair()
    setAberto(false)
    window.location.reload()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Gatilho: avatar */}
      <button
        onClick={() => setAberto(!aberto)}
        aria-label="Menu da conta"
        aria-expanded={aberto}
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.08)',
          background: logado ? '#fff' : 'rgba(255,255,255,0.16)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          color: logado ? 'var(--text)' : '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 15,
          fontFamily: 'var(--fonte-titulo)',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {logado ? (
          status.avatarUrl ? (
            <img src={status.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : inicial
        ) : <IconUser size={20} stroke={2} />}
      </button>

      {/* Popover */}
      {aberto && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 280,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--raio)',
            boxShadow: 'var(--shadow)',
            zIndex: 60,
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            animation: 'fadeSlideIn .18s ease-out',
          }}
        >
          {/* Cabeçalho de identidade */}
          {logado ? (
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {status.avatarUrl ? (
                  <img src={status.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: 14, objectFit: 'cover', flex: '0 0 auto' }} />
                ) : (
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: 'var(--card)',
                      border: '1px solid var(--line)',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 18,
                      fontFamily: 'var(--fonte-titulo)',
                      flex: '0 0 auto',
                    }}
                  >
                    {inicial}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {status.nome ?? 'Surfista'}
                  </div>
                  {status.email && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {status.email}
                    </div>
                  )}
                  {ehStaff && labelPapel[status.papel] && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: corPapel(status.papel),
                        color: '#05312F',
                      }}
                    >
                      {labelPapel[status.papel]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => ir('/perfil')}
              style={{
                width: '100%',
                padding: '16px 16px 12px',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--line)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                display: 'block'
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'var(--chip-bg)',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '0 0 auto',
                  }}
                >
                  <IconUserCircle size={24} stroke={1.5} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Visitante</div>
                  <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 2, fontWeight: 600 }}>Entre para contribuir</div>
                </div>
              </div>
            </button>
          )}

          {/* Itens */}
          <div style={{ padding: '8px 0' }}>
            <MenuItem
              icon={<IconRipple size={20} stroke={2} />}
              titulo="Início (Radar)"
              sub="Picos, previsão e registros"
              onClick={() => ir('/')}
            />

            {perm.acessa && (
              <MenuItem
                icon={<IconShieldLock size={20} stroke={2} />}
                titulo="Painel Administrativo"
                sub="Gestão, moderação e auditoria"
                destaque
                onClick={() => ir('/admin')}
              />
            )}

            <MenuItem
              icon={<IconUserCircle size={20} stroke={2} />}
              titulo="Meu Perfil"
              sub="Reputação e histórico"
              onClick={() => ir('/perfil')}
            />

            {/* PWA */}
            {instalado ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  fontSize: 14,
                  color: 'var(--tag-ok-fg)',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--tag-ok-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '0 0 auto',
                  }}
                >
                  <IconCheck size={18} stroke={2.5} />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>App Instalado ✓</div>
                </div>
              </div>
            ) : _deferredPrompt ? (
              <MenuItem
                icon={<IconDeviceMobile size={20} stroke={2} />}
                titulo="Instalar app"
                sub="Acesso rápido na tela inicial"
                onClick={handleInstalarPWA}
              />
            ) : null}
          </div>

          {/* Sair / Entrar */}
          <div style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
            {logado ? (
              <button
                onClick={handleSair}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px 16px',
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--coral)',
                  fontFamily: 'inherit',
                }}
              >
                <IconLogout size={20} stroke={2} />
                Sair da conta
              </button>
            ) : (
              <button
                onClick={() => { setAberto(false); abrir() }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px 16px',
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--primary)',
                  fontFamily: 'inherit',
                }}
              >
                <IconLogin size={20} stroke={2} />
                Entrar na conta
              </button>
            )}
          </div>
        </div>
      )}

      {/* Animação inline */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

/* ── Item do menu ─────────────────────────────────────────────────────── */
function MenuItem({
  icon,
  titulo,
  sub,
  destaque,
  onClick,
}: {
  icon: React.ReactNode
  titulo: string
  sub: string
  destaque?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 16px',
        background: destaque ? 'var(--deep)' : 'none',
        border: 0,
        borderRadius: destaque ? 0 : undefined,
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => {
        if (!destaque) (e.currentTarget as HTMLElement).style.background = 'var(--chip-bg)'
      }}
      onMouseLeave={(e) => {
        if (!destaque) (e.currentTarget as HTMLElement).style.background = 'none'
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: destaque ? 'rgba(255,255,255,0.12)' : 'var(--chip-bg)',
          color: destaque ? '#fff' : 'var(--text)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: destaque ? '#fff' : 'var(--text)' }}>
          {titulo}
        </div>
        <div style={{ fontSize: 12, color: destaque ? 'rgba(255,255,255,.7)' : 'var(--muted)' }}>
          {sub}
        </div>
      </div>
      <IconChevronRight size={16} stroke={2} style={{ color: destaque ? 'rgba(255,255,255,.5)' : 'var(--muted)', flex: '0 0 auto' }} />
    </button>
  )
}
