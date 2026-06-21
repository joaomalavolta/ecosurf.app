import { NavLink, useNavigate } from 'react-router-dom'

const itens = [
  { to: '/', icon: '🌊', label: 'Radar', end: true },
  { to: '/mapa', icon: '🗺️', label: 'Mapa', end: false },
  { to: '/acoes', icon: '🤝', label: 'Ações', end: false },
  { to: '/perfil', icon: '👤', label: 'Perfil', end: false },
]

/**
 * Caminho C: Radar como espinha, captura no CENTRO (a foto é o conteúdo nobre,
 * merece o lugar nobre). O botão central abre a câmera direto (2 toques).
 */
export function BottomNav() {
  const navigate = useNavigate()
  return (
    <nav
      aria-label="Navegação principal"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 0,
        width: '100%',
        maxWidth: 'var(--largura-app)',
        height: 'calc(var(--altura-nav) + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'rgba(245,241,232,0.96)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--linha)',
        display: 'grid',
        gridTemplateColumns: 'repeat(5,1fr)',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      {itens.slice(0, 2).map((it) => (
        <NavItem key={it.to} {...it} />
      ))}

      {/* slot central: captura */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/capturar')}
          aria-label="Registrar agora (abre a câmera)"
          style={{
            width: 60,
            height: 60,
            marginTop: -28,
            borderRadius: 999,
            border: '4px solid var(--maresia)',
            background: 'var(--por-do-sol)',
            color: '#fff',
            fontSize: 26,
            boxShadow: '0 8px 18px rgba(232,116,59,0.45)',
            cursor: 'pointer',
          }}
        >
          📷
        </button>
      </div>

      {itens.slice(2).map((it) => (
        <NavItem key={it.to} {...it} />
      ))}
    </nav>
  )
}

function NavItem({ to, icon, label, end }: { to: string; icon: string; label: string; end: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        textDecoration: 'none',
        fontSize: 11,
        fontWeight: 700,
        color: isActive ? 'var(--mar-profundo)' : 'var(--muted)',
      })}
    >
      <span style={{ fontSize: 20 }} aria-hidden="true">{icon}</span>
      {label}
    </NavLink>
  )
}
