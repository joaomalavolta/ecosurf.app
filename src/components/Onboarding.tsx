import { useState } from 'react'
import { IconCamera, IconMapPin, IconRipple } from '@tabler/icons-react'

const KEY = 'ecosurf:onboarded'

/** Primeira abertura: explica o app e pede câmera + localização (anti-fake). */
export function Onboarding() {
  const [visivel, setVisivel] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== '1'
    } catch {
      return false
    }
  })
  if (!visivel) return null

  function fechar() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    setVisivel(false)
  }

  async function ativar() {
    try {
      await new Promise<void>((res) =>
        navigator.geolocation?.getCurrentPosition(() => res(), () => res(), { timeout: 5000 }),
      )
    } catch {
      /* ignore */
    }
    try {
      const s = await navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      s?.getTracks().forEach((t) => t.stop())
    } catch {
      /* ignore */
    }
    fechar()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        maxWidth: 'var(--largura-app)',
        margin: '0 auto',
        background: 'linear-gradient(160deg, var(--azul-abissal), var(--azul) 70%, var(--verde))',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'calc(env(safe-area-inset-top,0px) + 44px) 24px calc(env(safe-area-inset-bottom,0px) + 28px)',
      }}
    >
      <div>
        <IconRipple size={40} stroke={1.6} />
        <h1 style={{ fontFamily: 'var(--fonte-titulo)', fontSize: 30, lineHeight: 1.05, marginTop: 14 }}>
          Bem-vindo ao Ecosurf
        </h1>
        <p style={{ color: 'rgba(255,255,255,.85)', marginTop: 12, lineHeight: 1.5, fontSize: 15 }}>
          O mar de hoje, pela lente de quem está lá. Veja a condição dos picos, registre o que vê no
          mar e ajude a defender o litoral.
        </p>
        <div className="stack" style={{ marginTop: 22 }}>
          <div className="row"><IconCamera size={22} stroke={2} /> A câmera abre apontada — 2 toques pra registrar.</div>
          <div className="row"><IconMapPin size={22} stroke={2} /> A localização confirma que a foto é do pico (anti-fake).</div>
        </div>
      </div>
      <div className="stack">
        <button className="btn acento full" onClick={ativar}>Ativar câmera e localização</button>
        <button onClick={fechar} style={{ background: 'none', border: 0, color: 'rgba(255,255,255,.8)', fontSize: 14, cursor: 'pointer' }}>
          Agora não
        </button>
      </div>
    </div>
  )
}
