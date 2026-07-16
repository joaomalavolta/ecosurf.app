import { useEffect, useState } from 'react'
import { IconX, IconChevronLeft, IconChevronRight, IconMapPin, IconPlayerPlayFilled } from '@tabler/icons-react'
import { Photo } from './Photo'
import type { Foto } from '../types/domain'

/**
 * Visualizador em tela cheia (lightbox) com navegação e contexto.
 *
 * A timeline mostra o registro num quadro 4:3 fixo — bom para leitura de
 * condição, apertado para apreciar. Aqui o registro ocupa a tela toda e o
 * usuário navega entre os registros do dia sem sair. Um cabeçalho fixo mostra
 * SEMPRE pico, dia e hora — sem isso, ao deslizar entre fotos a pessoa perde a
 * referência de "de onde é isso mesmo?".
 *
 * Fechar: toque no fundo, no X, ou Esc. Navegar: setas na tela ou ←/→.
 */
export function VisualizadorMidia({
  fotos,
  indiceInicial,
  picoNome,
  onFechar,
}: {
  fotos: Foto[]
  indiceInicial: number
  picoNome?: string
  onFechar: () => void
}) {
  const [i, setI] = useState(indiceInicial)
  const f = fotos[i]
  const temAnterior = i > 0
  const temProxima = i < fotos.length - 1

  const irAnterior = () => setI((v) => Math.max(0, v - 1))
  const irProxima = () => setI((v) => Math.min(fotos.length - 1, v + 1))

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
      else if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1))
      else if (e.key === 'ArrowRight') setI((v) => Math.min(fotos.length - 1, v + 1))
    }
    window.addEventListener('keydown', aoTeclar)
    const overflowAntes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAntes
    }
  }, [onFechar, fotos.length])

  if (!f) return null

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(3, 15, 20, .95)',
        display: 'flex', flexDirection: 'column',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* CABEÇALHO DE CONTEXTO — sempre visível, localiza o usuário */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', color: '#fff', flexShrink: 0 }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 700 }}>
            <IconMapPin size={15} stroke={2} style={{ color: '#1ECBC3', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {picoNome ?? 'Pico'}
            </span>
            {f.ehVideo && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0, background: 'rgba(255,255,255,.16)', borderRadius: 99, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>
                <IconPlayerPlayFilled size={9} /> vídeo
              </span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)', marginTop: 2 }}>
            {dataHoraExtenso(f.capturadaEm)}
          </div>
        </div>
        {fotos.length > 1 && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', flexShrink: 0 }}>
            {i + 1} / {fotos.length}
          </span>
        )}
        <button
          onClick={onFechar}
          aria-label="Fechar"
          style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', flexShrink: 0, background: 'rgba(255,255,255,.14)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <IconX size={20} stroke={2} />
        </button>
      </div>

      {/* MÍDIA */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}
      >
        {f.ehVideo && f.videoUrl ? (
          <video key={f.id} src={f.videoUrl} poster={f.url} controls loop playsInline autoPlay
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, display: 'block' }} />
        ) : f.url ? (
          <img key={f.id} src={f.url} alt={f.observacao ?? 'Registro do pico'}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12, display: 'block' }} />
        ) : (
          <div style={{ width: 'min(88vw, 520px)', aspectRatio: '4 / 3' }}>
            <Photo seed={f.id} alt={f.observacao ?? 'Registro do pico'} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
          </div>
        )}

        {temAnterior && (
          <button onClick={irAnterior} aria-label="Registro anterior" style={{ ...setaEstilo, left: 6 }}>
            <IconChevronLeft size={26} stroke={2.4} />
          </button>
        )}
        {temProxima && (
          <button onClick={irProxima} aria-label="Próximo registro" style={{ ...setaEstilo, right: 6 }}>
            <IconChevronRight size={26} stroke={2.4} />
          </button>
        )}
      </div>

      {f.observacao && (
        <div onClick={(e) => e.stopPropagation()}
          style={{ padding: '12px 16px', color: 'rgba(255,255,255,.85)', fontSize: 13, textAlign: 'center', lineHeight: 1.4, flexShrink: 0 }}>
          {f.observacao}
        </div>
      )}
    </div>
  )
}

const setaEstilo: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  width: 42, height: 42, borderRadius: '50%', border: 'none',
  background: 'rgba(255,255,255,.16)', color: '#fff', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

/** "16 de julho, 20:24" — dia e hora por extenso, para localizar o usuário. */
function dataHoraExtenso(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const dia = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${dia}, ${hora}`
}
