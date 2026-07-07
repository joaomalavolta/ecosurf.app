import { Link } from 'react-router-dom'
import {
  IconDeviceMobile,
  IconWaveSine,
  IconMapPin,
  IconUsers,
  IconAlertTriangle,
  IconHeart,
} from '@tabler/icons-react'
import { Brand } from '../components/Brand'

const PILARES = [
  { Icon: IconAlertTriangle, titulo: 'Alertas Ambientais', texto: 'Registre lixo, esgoto, erosão e outros impactos no litoral' },
  { Icon: IconMapPin, titulo: 'Mapeie Picos', texto: 'Documente a condição dos picos de surf do Brasil' },
  { Icon: IconUsers, titulo: 'Mutirões', texto: 'Participe de ações coletivas pela conservação das praias' },
  { Icon: IconHeart, titulo: 'Rede Cidadã', texto: 'Fortaleça uma comunidade de guardiões do Oceano' },
]

/**
 * Landing page exibida APENAS no desktop (≥1024 px) quando o visitante
 * não está logado. Mostra o propósito do app, uma animação de onda e um
 * QR code grande para que o usuário escaneie com o celular — o app é
 * feito para ser usado na praia, pelo celular.
 *
 * O mobile continua usando a LandingPage original com fluxo de cadastro.
 */
export function DesktopLandingPage() {
  return (
    <div className="desktop-landing">
      {/* ── Photo background (onda real) ── */}
      <div className="dl-photo-bg" aria-hidden="true" />

      {/* ── Wave canvas background (SVG animado sobre a foto) ── */}
      <div className="dl-wave-bg" aria-hidden="true">
        <svg className="dl-wave" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path className="dl-wave-path dl-wave-1" d="M0,160 C360,260 720,60 1080,160 C1260,210 1380,140 1440,160 L1440,320 L0,320 Z" />
          <path className="dl-wave-path dl-wave-2" d="M0,200 C320,100 640,300 960,180 C1120,120 1320,220 1440,180 L1440,320 L0,320 Z" />
          <path className="dl-wave-path dl-wave-3" d="M0,240 C240,180 480,300 720,220 C960,140 1200,280 1440,220 L1440,320 L0,320 Z" />
        </svg>
      </div>

      {/* ── Content ── */}
      <header className="dl-header">
        <Brand height={38} />
        <Link to="/mapa" className="dl-header-link">
          Explorar mapa
        </Link>
      </header>

      <main className="dl-main">
        {/* Left — hero text */}
        <section className="dl-hero">
          <div className="dl-hero-badge">
            <IconWaveSine size={16} stroke={2} />
            Surfar Global &amp; Agir Local
          </div>

          <h1 className="dl-title">
            Ajude a cuidar dos<br />picos de surf e do Oceano
          </h1>

          <p className="dl-subtitle">
            Radar de surf colaborativo e cartografia socioambiental do litoral brasileiro.
            Registre condições ambientais, compartilhe alertas e participe de ações coletivas.
          </p>

          <div className="dl-pilares">
            {PILARES.map((p, i) => (
              <div key={i} className="dl-pilar">
                <div className="dl-pilar-icon">
                  <p.Icon size={20} stroke={1.8} />
                </div>
                <div>
                  <strong>{p.titulo}</strong>
                  <span>{p.texto}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right — QR code card */}
        <section className="dl-qr-section">
          <div className="dl-qr-card">
            <div className="dl-qr-phone-icon">
              <IconDeviceMobile size={28} stroke={1.6} />
            </div>

            <h2 className="dl-qr-title">
              Aponte a câmera<br />do celular
            </h2>

            <div className="dl-qr-frame">
              <img
                src="/qr_ecosurf.svg"
                alt="QR code para ecosurf.app"
                width={200}
                height={200}
                className="dl-qr-img"
              />
            </div>

            <p className="dl-qr-url">ecosurf.app</p>

            <p className="dl-qr-hint">
              O Ecosurf foi feito para usar na praia,<br />
              direto pelo celular. Escaneie e comece!
            </p>
          </div>
        </section>
      </main>

      <footer className="dl-footer">
        <p>© {new Date().getFullYear()} Ecosurf — Ciência cidadã pelo Oceano</p>
      </footer>
    </div>
  )
}
