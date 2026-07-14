import { useEffect, useRef, useState, useCallback } from 'react'
import { IconCheck, IconScissors } from '@tabler/icons-react'
import { VIDEO_MAX_S } from '../lib/video'
import { BotaoVoltarOverlay } from './BotaoVoltarOverlay'

/**
 * Linha de edição do vídeo da galeria.
 *
 * Por que existe: cortar os 5 PRIMEIROS segundos por decreto é arbitrário — a
 * onda boa quase nunca está no começo do arquivo. Aqui o autor arrasta uma
 * janela de 5 s sobre a régua do vídeo, vê o trecho rodando em loop e só então
 * confirma. O corte de verdade (re-encode) acontece depois, na CapturePage.
 *
 * A régua mostra quadros reais do vídeo (filmstrip). Se o aparelho não deixar
 * extrair os quadros, a barra continua funcionando — só fica lisa.
 */
export function RecortarVideo({
  file,
  onCancelar,
  onConfirmar,
}: {
  file: File
  onCancelar: () => void
  onConfirmar: (inicioS: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const barraRef = useRef<HTMLDivElement>(null)
  const [url] = useState(() => URL.createObjectURL(file))
  const [duracao, setDuracao] = useState(0)
  const [inicio, setInicio] = useState(0)
  const [quadros, setQuadros] = useState<string[]>([])
  const arrastando = useRef(false)

  useEffect(() => () => URL.revokeObjectURL(url), [url])

  const janela = Math.min(VIDEO_MAX_S, duracao || VIDEO_MAX_S)
  const maxInicio = Math.max(0, duracao - janela)
  const fracInicio = duracao > 0 ? inicio / duracao : 0
  const fracJanela = duracao > 0 ? janela / duracao : 1

  // Filmstrip: alguns quadros ao longo do vídeo, para o autor se localizar.
  useEffect(() => {
    let vivo = true
    const v = document.createElement('video')
    v.src = url
    v.muted = true
    v.preload = 'auto'
    v.onloadeddata = async () => {
      if (!v.duration || !isFinite(v.duration) || !v.videoWidth) return
      const canvas = document.createElement('canvas')
      const alturaAlvo = 96
      canvas.height = alturaAlvo
      canvas.width = Math.round((v.videoWidth / v.videoHeight) * alturaAlvo)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const N = 8
      const saida: string[] = []
      for (let i = 0; i < N && vivo; i++) {
        const t = (v.duration * (i + 0.5)) / N
        try {
          await new Promise<void>((res, rej) => {
            const ok = () => { v.onseeked = null; res() }
            v.onseeked = ok
            v.onerror = () => rej(new Error('seek'))
            v.currentTime = t
            setTimeout(res, 1200) // aparelho lento: segue com o que tiver
          })
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
          saida.push(canvas.toDataURL('image/jpeg', 0.6))
        } catch {
          break
        }
      }
      if (vivo && saida.length) setQuadros(saida)
    }
    return () => { vivo = false; v.src = '' }
  }, [url])

  // O preview roda em loop DENTRO da janela escolhida.
  useEffect(() => {
    const v = videoRef.current
    if (!v || duracao === 0) return
    let raf = 0
    const vigiar = () => {
      if (v.currentTime >= inicio + janela - 0.05 || v.currentTime < inicio - 0.05) {
        v.currentTime = inicio
      }
      raf = requestAnimationFrame(vigiar)
    }
    raf = requestAnimationFrame(vigiar)
    return () => cancelAnimationFrame(raf)
  }, [inicio, janela, duracao])

  const moverPara = useCallback((clientX: number) => {
    const barra = barraRef.current
    if (!barra || duracao === 0) return
    const r = barra.getBoundingClientRect()
    // O ponteiro fica no MEIO da janela — arrastar fica natural.
    const frac = (clientX - r.left) / r.width
    const centro = frac * duracao
    setInicio(Math.min(maxInicio, Math.max(0, centro - janela / 2)))
  }, [duracao, janela, maxInicio])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#06222E', zIndex: 60,
      display: 'flex', flexDirection: 'column',
      padding: '18px 16px calc(env(safe-area-inset-bottom, 0px) + 18px)',
      touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
    }}>
      <BotaoVoltarOverlay onClick={onCancelar} label="Outro vídeo" />

      <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: 21, display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconScissors size={20} stroke={2} /> Escolha os 5 segundos
      </h2>
      <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13, margin: '0 0 14px' }}>
        Arraste a janela sobre a linha para achar o melhor trecho.
      </p>

      <div style={{
        width: '100%', aspectRatio: '4 / 3', borderRadius: 14, overflow: 'hidden',
        background: '#0a1929', marginBottom: 16,
      }}>
        <video
          ref={videoRef}
          src={url}
          muted
          playsInline
          autoPlay
          loop
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration
            if (isFinite(d) && d > 0) setDuracao(d)
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>

      {/* Régua: quadros do vídeo + janela de 5s arrastável */}
      <div
        ref={barraRef}
        onPointerDown={(e) => {
          arrastando.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          moverPara(e.clientX)
        }}
        onPointerMove={(e) => { if (arrastando.current) moverPara(e.clientX) }}
        onPointerUp={() => { arrastando.current = false }}
        onPointerCancel={() => { arrastando.current = false }}
        style={{
          position: 'relative', height: 62, borderRadius: 10, overflow: 'hidden',
          background: '#0a1929', cursor: 'grab', display: 'flex',
        }}
      >
        {quadros.length > 0
          ? quadros.map((q, i) => (
              <img
                key={i}
                src={q}
                alt=""
                draggable={false}
                style={{ flex: 1, minWidth: 0, height: '100%', objectFit: 'cover', opacity: .55 }}
              />
            ))
          : <div style={{ flex: 1, background: 'linear-gradient(90deg, #0D6EA8, #2E9BD6)', opacity: .35 }} />}

        {/* A janela selecionada */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${fracInicio * 100}%`, width: `${fracJanela * 100}%`,
          border: '2.5px solid #1ECBC3', borderRadius: 8,
          background: 'rgba(30,203,195,.14)',
          boxShadow: '0 0 0 2000px rgba(4,20,27,.5)',
          pointerEvents: 'none',
        }} />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        color: 'rgba(255,255,255,.55)', fontSize: 11, marginTop: 6,
      }}>
        <span>{formatar(inicio)}</span>
        <span style={{ color: '#1ECBC3', fontWeight: 700 }}>
          {formatar(inicio)} – {formatar(inicio + janela)}
        </span>
        <span>{formatar(duracao)}</span>
      </div>

      <div style={{ flex: 1 }} />

      <button
        className="btn full"
        onClick={() => onConfirmar(inicio)}
        disabled={duracao === 0}
        style={{ marginTop: 16 }}
      >
        <IconCheck size={18} stroke={2.4} /> Usar este trecho
      </button>
    </div>
  )
}

function formatar(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const seg = Math.floor(s % 60)
  return `${m}:${String(seg).padStart(2, '0')}`
}
