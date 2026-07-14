import { useState, useCallback } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { IconCheck, IconZoomIn } from '@tabler/icons-react'
import { BotaoVoltarOverlay } from './BotaoVoltarOverlay'

/**
 * Corte de foto antes do upload — a peça que padroniza o acervo.
 *
 * Sem isso, cada foto chega na proporção do celular de quem enviou (vertical,
 * horizontal, quadrada) e a exibição fica presa a um dilema sem saída: `cover`
 * corta o assunto, `contain` deixa cada foto ocupando o quadro de um jeito.
 * Cortando na origem, toda foto nasce na proporção certa — o quadro fica
 * sempre cheio, o assunto sempre inteiro e a estética uniforme.
 *
 * Proporções: 4/3 (alertas e mutirões) · 16/5 (capa) · 1 (avatar/logo).
 */

async function recortar(src: string, area: Area, maxLargura: number): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => rej(new Error('Falha ao ler a imagem'))
    i.src = src
  })

  const escala = Math.min(1, maxLargura / area.width)
  const w = Math.round(area.width * escala)
  const h = Math.round(area.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, w, h)

  return new Promise<Blob>((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error('Falha ao gerar a imagem'))),
      'image/webp',
      0.86,
    ),
  )
}

export function CorteFoto({
  arquivo,
  proporcao,
  maxLargura = 1600,
  titulo = 'Enquadre a foto',
  onPronto,
  onCancelar,
}: {
  arquivo: File
  proporcao: number
  maxLargura?: number
  titulo?: string
  onPronto: (blob: Blob) => void
  onCancelar: () => void
}) {
  const [src] = useState(() => URL.createObjectURL(arquivo))
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const aoCompletar = useCallback((_: Area, px: Area) => setArea(px), [])

  async function confirmar() {
    if (!area || ocupado) return
    setOcupado(true)
    try {
      onPronto(await recortar(src, area, maxLargura))
    } catch {
      setOcupado(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: '#06222E',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Cabeçalho */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', flexShrink: 0,
      }}>
        <BotaoVoltarOverlay onClick={onCancelar} label="Voltar" style={{ padding: '0 8px 0 0' }} />
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{titulo}</span>
        <button
          onClick={() => void confirmar()}
          disabled={ocupado}
          aria-label="Confirmar corte"
          style={{ background: 'none', border: 0, color: 'var(--turq, #1ECBC3)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4, opacity: ocupado ? 0.5 : 1 }}
        >
          <IconCheck size={24} stroke={2.2} />
        </button>
      </div>

      {/* Área de corte */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#02141c' }}>
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={proporcao}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={aoCompletar}
          showGrid
          restrictPosition
        />
      </div>

      {/* Zoom + ações */}
      <div style={{ padding: '16px 20px 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <IconZoomIn size={18} stroke={2} style={{ color: 'rgba(255,255,255,.7)', flexShrink: 0 }} />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Aproximar"
            style={{ flex: 1, accentColor: 'var(--turq, #1ECBC3)' }}
          />
        </div>
        <button
          className="btn acento full"
          onClick={() => void confirmar()}
          disabled={ocupado}
        >
          <IconCheck size={17} stroke={2} /> {ocupado ? 'Preparando…' : 'Usar esta foto'}
        </button>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 11.5, textAlign: 'center', marginTop: 10 }}>
          Arraste para posicionar · aproxime para enquadrar
        </p>
      </div>
    </div>
  )
}
