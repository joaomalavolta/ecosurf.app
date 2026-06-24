import { useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  IconAlertTriangle,
  IconMapPin,
  IconUsers,
  IconHeart,
  IconChevronRight,
  IconChevronDown,
} from '@tabler/icons-react'
import { Brand } from '../components/Brand'
import { AuthCard } from '../components/AuthCard'

const PILARES = [
  { Icon: IconAlertTriangle, texto: 'Registre lixo, esgoto, erosão e outros impactos' },
  { Icon: IconMapPin, texto: 'Mapeie a condição dos picos de surf' },
  { Icon: IconUsers, texto: 'Participe de mutirões e ações ambientais' },
  { Icon: IconHeart, texto: 'Fortaleça uma rede cidadã pelo Oceano' },
]

export function LandingPage() {
  const slide2Ref = useRef<HTMLDivElement>(null)

  function scrollToSignup() {
    slide2Ref.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="landing-wrap">
      {/* ────── SLIDE 1: Sobre o app ────── */}
      <section className="landing-slide landing-slide-1">
        <div className="landing-bg" />
        <div className="landing-content">
          <Brand height={44} />

          <h1 className="landing-headline">
            Ajude a cuidar dos<br />picos de surf e do Oceano
          </h1>

          <p className="landing-sub">
            Registre condições ambientais, compartilhe alertas e participe de ações coletivas para proteger praias, ondas e ecossistemas de surf.
          </p>

          {/* Value props */}
          <div className="landing-card">
            {PILARES.map((p, i) => (
              <div key={i} className="landing-pilar">
                <div className="landing-pilar-icon">
                  <p.Icon size={20} stroke={1.8} />
                </div>
                <span>{p.texto}</span>
              </div>
            ))}
          </div>

          {/* CTA transparente */}
          <button className="landing-cta" onClick={scrollToSignup}>
            Criar conta e começar agora
          </button>

          <Link to="/mapa" className="landing-secondary">
            Explorar o mapa primeiro <IconChevronRight size={16} stroke={2.5} />
          </Link>

          {/* Scroll hint */}
          <button className="landing-scroll-hint" onClick={scrollToSignup} aria-label="Ver mais">
            <IconChevronDown size={20} stroke={2} />
          </button>
        </div>
      </section>

      {/* ────── SLIDE 2: Cadastro ────── */}
      <section className="landing-slide landing-slide-2" ref={slide2Ref}>
        <div className="landing-bg" />
        <div className="landing-content">
          <Brand height={44} />

          <h2 className="landing-headline">
            Entre para a comunidade
          </h2>
          <p className="landing-sub">
            Cadastre-se com seu e-mail e comece a monitorar, registrar e mobilizar pelo litoral brasileiro.
          </p>

          {/* Auth card adaptado para dark */}
          <div className="landing-auth">
            <AuthCard />
          </div>

          <p className="landing-footer">
            Seu registro ajuda a dar visibilidade aos problemas, mobilizar pessoas e inspirar soluções.
          </p>

          <Link to="/mapa" className="landing-secondary" style={{ marginTop: 20 }}>
            Explorar o mapa primeiro <IconChevronRight size={16} stroke={2.5} />
          </Link>
        </div>
      </section>
    </div>
  )
}
