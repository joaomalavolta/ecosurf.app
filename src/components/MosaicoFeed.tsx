import { Link } from 'react-router-dom'
import { IconPlayerPlayFilled } from '@tabler/icons-react'
import type { Foto, Pico } from '../types/domain'

/**
 * Feed em mosaico — 3 colunas de miniaturas, para varredura visual rápida do
 * litoral. Complementa (não substitui) o feed empilhado, que traz o contexto
 * completo de cada registro. Aqui a alma do Ecosurf é preservada com dois
 * sinais mínimos: o selo de vídeo (play) e a hora do registro.
 *
 * Toque abre a foto na página do pico (com âncora para o registro), atendendo
 * "abre a foto, com link pro pico".
 */
export function MosaicoFeed({
  fotos,
  picoMap,
}: {
  fotos: Foto[]
  picoMap: Map<string, Pico>
}) {
  if (fotos.length === 0) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 3,
      padding: '2px 3px',
    }}>
      {fotos.map((f) => {
        const pico = picoMap.get(f.picoId)
        return (
          <Link
            key={f.id}
            to={`/pico/${f.picoId}?foto=${f.id}`}
            style={{
              position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden',
              borderRadius: 6, display: 'block', background: gradienteDe(f.picoId),
            }}
          >
            {f.thumbUrl && (
              <img
                src={f.thumbUrl}
                alt={pico?.nome ?? 'registro'}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}

            {/* Selo de vídeo — sem ele, um clipe pareceria foto no mosaico */}
            {f.ehVideo && (
              <span style={{
                position: 'absolute', top: 5, right: 5,
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(0,0,0,.55)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <IconPlayerPlayFilled size={11} color="#fff" />
              </span>
            )}

            {/* Rodapé com pico + hora: a leitura honesta de "quando" */}
            <span style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              padding: '10px 6px 4px',
              background: 'linear-gradient(transparent, rgba(0,0,0,.7))',
              color: '#fff', fontSize: 9.5, lineHeight: 1.2,
              display: 'flex', flexDirection: 'column', gap: 1,
            }}>
              <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pico?.nome ?? '—'}
              </span>
              <span style={{ opacity: .85 }}>{horaCurta(f.capturadaEm)}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

/** Hora local curta (HH:MM) do registro. */
function horaCurta(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Gradiente determinístico por pico — fundo quando não há miniatura. */
function gradienteDe(picoId: string): string {
  let h = 0
  for (let i = 0; i < picoId.length; i++) h = (h * 31 + picoId.charCodeAt(i)) % 360
  return `linear-gradient(135deg, hsl(${h}, 45%, 30%), hsl(${(h + 40) % 360}, 45%, 22%))`
}
