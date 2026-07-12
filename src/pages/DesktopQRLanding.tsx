import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { IconDeviceMobile, IconWorld, IconCamera, IconMapPin } from '@tabler/icons-react'
import { Brand } from '../components/Brand'

/**
 * Landing de desktop — o Ecosurf é um app de campo (câmera, GPS, mão molhada
 * na praia): tudo que importa acontece no celular. No desktop, em vez de um
 * app esticado, uma tela de convite: onda em tela cheia, QR para escanear e
 * abrir no telefone, e orientação para usar pelo navegador do celular.
 * O guard no App.tsx a exibe em qualquer rota ≥1024px (exceto /admin).
 */
export function DesktopQRLanding() {
  const [qr, setQr] = useState<string>('')

  useEffect(() => {
    QRCode.toDataURL('https://ecosurf.app', {
      width: 220,
      margin: 1,
      color: { dark: '#06222E', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    })
      .then(setQr)
      .catch(() => setQr(''))
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(380px, 1fr)',
      background: 'var(--bg)', overflow: 'auto',
    }}>
      {/* Lado esquerdo: onda em tela cheia com marca sobreposta */}
      <div style={{
        position: 'relative', minHeight: '100vh',
        background: "url('/wave-header.png') center/cover no-repeat",
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(6,34,46,.55), rgba(14,92,118,.35))',
        }} />
        <div style={{ position: 'absolute', left: 48, top: 44 }}>
          <Brand height={34} />
        </div>
        <div style={{ position: 'absolute', left: 48, bottom: 56, right: 48 }}>
          <h1 style={{ color: '#fff', fontSize: 40, lineHeight: 1.1, fontWeight: 800, textShadow: '0 2px 12px rgba(0,0,0,.35)', margin: 0 }}>
            Surfar Global,<br />Agir Local
          </h1>
          <p style={{ color: 'rgba(255,255,255,.9)', fontSize: 17, marginTop: 14, maxWidth: 440, textShadow: '0 1px 6px rgba(0,0,0,.3)' }}>
            Radar colaborativo de surf e cartografia socioambiental do litoral brasileiro.
          </p>
        </div>
      </div>

      {/* Lado direito: convite para abrir no celular */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 56px', textAlign: 'center', minHeight: '100vh',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'color-mix(in srgb, var(--turq) 12%, transparent)',
          color: 'var(--turq)', fontWeight: 700, fontSize: 13,
          padding: '7px 14px', borderRadius: 999, marginBottom: 22,
        }}>
          <IconDeviceMobile size={16} stroke={2} /> Feito para o celular
        </div>

        <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 10px', color: 'var(--text)' }}>
          Abra o Ecosurf no seu celular
        </h2>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.55, maxWidth: 380, margin: '0 0 28px' }}>
          O Ecosurf usa a câmera e o GPS do seu telefone para registrar ondas e alertas direto da praia. Escaneie o código para começar.
        </p>

        {/* QR */}
        <div style={{
          background: '#fff', padding: 18, borderRadius: 20,
          boxShadow: '0 8px 30px rgba(0,0,0,.12)', border: '1px solid var(--line)',
        }}>
          {qr
            ? <img src={qr} alt="QR code para abrir ecosurf.app" width={200} height={200} style={{ display: 'block' }} />
            : <div style={{ width: 200, height: 200, display: 'grid', placeItems: 'center' }}><span className="muted">gerando…</span></div>}
        </div>
        <div className="dado" style={{ marginTop: 14, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '.01em' }}>
          ecosurf.app
        </div>

        {/* Orientação */}
        <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left' }}>
            <IconWorld size={20} stroke={1.9} style={{ color: 'var(--turq)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
              Abra o <b>navegador do seu celular</b> (Chrome ou Safari) e acesse <b>ecosurf.app</b>.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left' }}>
            <IconCamera size={20} stroke={1.9} style={{ color: 'var(--turq)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
              Permita <b>câmera e localização</b> para registrar com selo de procedência.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left' }}>
            <IconMapPin size={20} stroke={1.9} style={{ color: 'var(--turq)', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
              Instale como app: no menu do navegador, toque em <b>Adicionar à tela inicial</b>.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
