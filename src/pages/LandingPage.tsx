import { Link, useNavigate } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconMapPin,
  IconUsers,
  IconHeart,
  IconChevronRight,
} from '@tabler/icons-react'
import { Brand } from '../components/Brand'

const PILARES = [
  { Icon: IconAlertTriangle, texto: 'Registre lixo, esgoto, erosão e outros impactos', cor: '#2dd4a8' },
  { Icon: IconMapPin, texto: 'Mapeie a condição dos picos de surf', cor: '#38bdf8' },
  { Icon: IconUsers, texto: 'Participe de mutirões e ações ambientais', cor: '#fb923c' },
  { Icon: IconHeart, texto: 'Fortaleça uma rede cidadã pelo Oceano', cor: '#f472b6' },
]

export function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="landing">
      {/* Background: wave photo + overlay */}
      <div className="landing-bg" />

      <div className="landing-content">
        {/* Logo */}
        <div style={{ marginBottom: 8 }}>
          <Brand height={48} />
        </div>

        {/* Headline */}
        <h1 className="landing-headline">
          Ajude a cuidar dos picos de surf e do Oceano
        </h1>

        {/* Sub */}
        <p className="landing-sub">
          Registre condições ambientais, compartilhe alertas e participe de ações coletivas para proteger praias, ondas e ecossistemas de surf.
        </p>

        {/* Value props card */}
        <div className="landing-card">
          {PILARES.map((p, i) => (
            <div key={i} className="landing-pilar">
              <div className="landing-pilar-icon" style={{ background: `${p.cor}20`, color: p.cor }}>
                <p.Icon size={20} stroke={2} />
              </div>
              <span>{p.texto}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="landing-cta"
          onClick={() => navigate('/perfil')}
        >
          <Brand height={22} />
          <span>Criar conta e começar agora</span>
        </button>

        {/* Secondary */}
        <Link to="/mapa" className="landing-secondary">
          Explorar o mapa primeiro <IconChevronRight size={16} stroke={2.5} />
        </Link>

        {/* Footer microcopy */}
        <p className="landing-footer">
          Seu registro ajuda a dar visibilidade aos problemas, mobilizar pessoas e inspirar soluções.
        </p>
      </div>
    </div>
  )
}
