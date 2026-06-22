import { NavLink, useNavigate } from 'react-router-dom'
import {
  IconRipple,
  IconMap2,
  IconHeartHandshake,
  IconUser,
  IconCamera,
  type IconProps,
} from '@tabler/icons-react'
import type { ComponentType } from 'react'
import { useOnboarding } from '../onboarding/OnboardingContext'

type Item = { to: string; Icon: ComponentType<IconProps>; label: string; end: boolean }

const itens: Item[] = [
  { to: '/', Icon: IconRipple, label: 'Radar', end: true },
  { to: '/mapa', Icon: IconMap2, label: 'Mapa', end: false },
  { to: '/acoes', Icon: IconHeartHandshake, label: 'Ações', end: false },
  { to: '/perfil', Icon: IconUser, label: 'Perfil', end: false },
]

/**
 * Caminho C: Radar como espinha, captura no CENTRO (a foto é o conteúdo nobre).
 * O botão central abre a câmera direto (2 toques).
 */
export function BottomNav() {
  const navigate = useNavigate()
  const { onboarded, abrir } = useOnboarding()
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
        background: 'rgba(7,28,37,0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--stroke)',
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
          onClick={() => (onboarded ? navigate('/capturar') : abrir())}
          aria-label="Registrar agora (abre a câmera)"
          style={{
            width: 62,
            height: 62,
            marginTop: -30,
            borderRadius: 22,
            border: '5px solid var(--deep)',
            background: 'linear-gradient(150deg, var(--turq), #15A597)',
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 14px 28px -6px rgba(31,227,200,0.8)',
            cursor: 'pointer',
          }}
        >
          <IconCamera size={26} stroke={2} />
        </button>
      </div>

      {itens.slice(2).map((it) => (
        <NavItem key={it.to} {...it} />
      ))}
    </nav>
  )
}

function NavItem({ to, Icon, label, end }: Item) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        textDecoration: 'none',
        fontSize: 11,
        fontWeight: 700,
        color: isActive ? 'var(--turq)' : 'var(--mist)',
      })}
    >
      <Icon size={22} stroke={2} aria-hidden />
      {label}
    </NavLink>
  )
}
