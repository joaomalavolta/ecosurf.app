import { useEffect } from 'react'
import { IconX } from '@tabler/icons-react'
import { Photo } from './Photo'

/**
 * Visualizador em tela cheia (lightbox) para foto ou vídeo.
 *
 * A timeline mostra o registro num quadro 4:3 fixo — bom para leitura de
 * condição, apertado para apreciar. Aqui o registro ocupa a tela toda: a foto
 * cresce até o limite do dispositivo; o vídeo ganha controles nativos e som.
 * Fechar: toque fora, no X, ou tecla Esc.
 */
export function VisualizadorMidia({
  ehVideo,
  url,
  videoUrl,
  seed,
  legenda,
  onFechar,
}: {
  ehVideo?: boolean
  url?: string
  videoUrl?: string
  seed: string
  legenda?: string
  onFechar: () => void
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', aoTeclar)
    // Trava o scroll do fundo enquanto o visualizador está aberto.
    const overflowAntes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAntes
    }
  }, [onFechar])

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(3, 15, 20, .94)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 12px calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      <button
        onClick={onFechar}
        aria-label="Fechar"
        style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', right: 12,
          width: 40, height: 40, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,.14)', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
        }}
      >
        <IconX size={22} stroke={2} />
      </button>

      {/* Para o clique na mídia de fechar o lightbox por engano. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
      >
        {ehVideo && videoUrl ? (
          <video
            src={videoUrl}
            poster={url}
            controls
            loop
            playsInline
            autoPlay
            style={{ maxWidth: '100%', maxHeight: '82vh', borderRadius: 12, display: 'block' }}
          />
        ) : url ? (
          <img
            src={url}
            alt={legenda ?? 'Registro do pico'}
            style={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain', borderRadius: 12, display: 'block' }}
          />
        ) : (
          // Sem URL de imagem: mostra o gradiente determinístico ampliado.
          <div style={{ width: 'min(88vw, 520px)', aspectRatio: '4 / 3' }}>
            <Photo seed={seed} alt={legenda ?? 'Registro do pico'} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
          </div>
        )}

        {legenda && (
          <p style={{ color: 'rgba(255,255,255,.85)', fontSize: 13, textAlign: 'center', margin: 0, maxWidth: 560, lineHeight: 1.4 }}>
            {legenda}
          </p>
        )}
      </div>
    </div>
  )
}
