import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { IconDeviceMobile, IconWorld, IconCamera, IconMapPin } from '@tabler/icons-react'

/**
 * Landing de desktop — a onda ocupa a TELA INTEIRA (não uma coluna), com o
 * conteúdo flutuando por cima: marca no topo, manifesto à esquerda, cartão
 * do QR à direita. O Ecosurf é app de campo (câmera, GPS, praia): o desktop
 * convida a abrir no celular em vez de esticar uma interface que não serve.
 *
 * Correções mantidas: overflow rolável (telas baixas não cortam), z-index
 * acima do app-shell, e o logo em tamanho pleno — o <img> direto evita o
 * maxWidth: 80% do componente Brand, que era o que o espremia.
 */
export function DesktopQRLanding() {
  const [qr, setQr] = useState<string>('')
  const [semLogo, setSemLogo] = useState(false)

  useEffect(() => {
    QRCode.toDataURL('https://ecosurf.app', {
      width: 240,
      margin: 1,
      color: { dark: '#06222E', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then(setQr)
      .catch(() => setQr(''))
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        overflow: 'auto',
        background: "url('/wave-header.webp') center/cover no-repeat #06222E",
      }}
    >
      {/* Véu para o texto respirar sobre a foto */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(105deg, rgba(6,34,46,.82) 0%, rgba(6,34,46,.62) 42%, rgba(10,48,66,.42) 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '40px clamp(32px, 5vw, 72px) 48px',
          boxSizing: 'border-box',
        }}
      >
        {/* Marca — logo em tamanho pleno, sem constrição */}
        <div style={{ flexShrink: 0 }}>
          {semLogo ? (
            <span style={{ fontFamily: 'var(--fonte-titulo)', fontWeight: 700, fontSize: 34, color: '#fff', letterSpacing: '-0.02em' }}>
              Ecosurf
            </span>
          ) : (
            <img
              src="/logo_ecosurf.png"
              alt="Ecosurf"
              style={{ height: 42, width: 'auto', display: 'block' }}
              onError={() => setSemLogo(true)}
            />
          )}
        </div>

        {/* Corpo: manifesto à esquerda, cartão do QR à direita */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 48,
            flexWrap: 'wrap',
            paddingTop: 32,
          }}
        >
          <div style={{ maxWidth: 540, minWidth: 300, flex: '1 1 380px' }}>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(30,203,195,.16)',
                border: '1px solid rgba(30,203,195,.35)',
                color: '#7FE7E1', fontWeight: 700, fontSize: 12.5,
                padding: '7px 14px', borderRadius: 999, marginBottom: 22,
                backdropFilter: 'blur(6px)',
              }}
            >
              <IconDeviceMobile size={15} stroke={2} /> Feito para o celular
            </span>

            <h1
              style={{
                color: '#fff',
                fontSize: 'clamp(38px, 4.4vw, 60px)',
                lineHeight: 1.05, fontWeight: 800, margin: 0,
                textShadow: '0 2px 20px rgba(0,0,0,.4)',
                letterSpacing: '-0.02em',
              }}
            >
              Surfar Global,
              <br />
              Agir Local
            </h1>

            <p
              style={{
                color: 'rgba(255,255,255,.92)',
                fontSize: 'clamp(16px, 1.3vw, 19px)',
                lineHeight: 1.6, marginTop: 20, maxWidth: 480,
                textShadow: '0 1px 8px rgba(0,0,0,.35)',
              }}
            >
              Radar colaborativo de surf, registro fotográfico comunitário e cartografia
              socioambiental do litoral brasileiro.
            </p>

            <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
              {[
                { Icone: IconWorld, texto: <>Abra o <b>navegador do seu celular</b> e acesse <b>ecosurf.app</b>.</> },
                { Icone: IconCamera, texto: <>Permita <b>câmera e localização</b> para registrar com selo de procedência.</> },
                { Icone: IconMapPin, texto: <>Instale como app: no menu do navegador, <b>Adicionar à tela inicial</b>.</> },
              ].map(({ Icone, texto }, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Icone size={20} stroke={1.9} style={{ color: '#7FE7E1', flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 14.5, color: 'rgba(255,255,255,.92)', lineHeight: 1.5, textShadow: '0 1px 6px rgba(0,0,0,.3)' }}>
                    {texto}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cartão do QR */}
          <div
            style={{
              flex: '0 0 auto',
              background: 'rgba(255,255,255,.1)',
              border: '1px solid rgba(255,255,255,.22)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRadius: 24,
              padding: 28,
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,.3)',
            }}
          >
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: '0 0 4px' }}>
              Escaneie para começar
            </p>
            <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 12.5, margin: '0 0 18px' }}>
              Aponte a câmera do seu celular
            </p>

            <div style={{ background: '#fff', padding: 14, borderRadius: 16, display: 'inline-block' }}>
              {qr ? (
                <img src={qr} alt="QR code para abrir ecosurf.app" width={200} height={200} style={{ display: 'block' }} />
              ) : (
                <div style={{ width: 200, height: 200, display: 'grid', placeItems: 'center', color: '#7B8794', fontSize: 13 }}>
                  gerando…
                </div>
              )}
            </div>

            <div className="dado" style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '.02em' }}>
              ecosurf.app
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
