import { useState } from 'react'
import { IconCamera, IconStar, IconSeeding, IconChevronRight } from '@tabler/icons-react'

/**
 * Tour de 3 dicas — mostrado UMA vez, após o primeiro acesso ao Radar.
 * Diferente do fluxo de cadastro (OnboardingFlow): aqui a pessoa já entrou
 * e conhece o essencial em três toques: registrar → favoritar → agir.
 * Marca no localStorage; nunca reaparece. Respeita "reduzir animações".
 */

const CHAVE = 'ecosurf.tour-visto'

export function jaViuTour(): boolean {
  try { return localStorage.getItem(CHAVE) === '1' } catch { return true }
}

const DICAS = [
  {
    Icone: IconCamera,
    cor: '#1FB6A6',
    titulo: 'Registre o mar',
    texto: 'O botão central é o coração do app: fotografe a onda, o pico ou uma ocorrência. Classifique depois — o momento vem primeiro.',
  },
  {
    Icone: IconStar,
    cor: '#E8A05C',
    titulo: 'Favorite seus picos',
    texto: 'Toque na estrela dos picos que você mais frequenta. Eles ganham um filtro só seu no radar, sempre à mão.',
  },
  {
    Icone: IconSeeding,
    cor: '#2E9B6B',
    titulo: 'Agir local',
    texto: 'Viu lixo, esgoto ou erosão? Registre um alerta. Organize um mutirão. Cada foto vira memória pública do litoral.',
  },
]

export function TourInicial({ onFechar }: { onFechar: () => void }) {
  const [passo, setPasso] = useState(0)
  const dica = DICAS[passo]
  const ultimo = passo === DICAS.length - 1

  function concluir() {
    try { localStorage.setItem(CHAVE, '1') } catch { /* modo privado */ }
    onFechar()
  }

  return (
    <div
      onClick={concluir}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(6, 34, 46, .72)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 'calc(env(safe-area-inset-bottom, 0px) + var(--altura-nav) + 16px) 16px 16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)', borderRadius: 20, padding: '22px 20px 18px',
          width: 'min(400px, 100%)', boxShadow: '0 12px 40px rgba(0,0,0,.35)',
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 15, marginBottom: 14,
          background: `color-mix(in srgb, ${dica.cor} 15%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <dica.Icone size={28} stroke={1.9} color={dica.cor} />
        </div>

        <h2 style={{ fontSize: 20, marginBottom: 6 }}>{dica.titulo}</h2>
        <p className="muted" style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 18 }}>{dica.texto}</p>

        <div className="between">
          <div style={{ display: 'flex', gap: 6 }}>
            {DICAS.map((_, i) => (
              <span key={i} style={{
                width: i === passo ? 20 : 7, height: 7, borderRadius: 99,
                background: i === passo ? dica.cor : 'var(--line)', transition: 'width .2s, background .2s',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!ultimo && (
              <button onClick={concluir} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13.5, cursor: 'pointer', padding: '8px 6px' }}>
                Pular
              </button>
            )}
            <button
              className="btn acento"
              onClick={() => (ultimo ? concluir() : setPasso((p) => p + 1))}
              style={{ padding: '9px 18px' }}
            >
              {ultimo ? 'Começar' : <>Próximo <IconChevronRight size={16} stroke={2} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
