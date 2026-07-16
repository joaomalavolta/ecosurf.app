import { useEffect, useState } from 'react'
import { IconRefresh, IconAlertTriangle, IconVideo, IconPhoto } from '@tabler/icons-react'
import { pendentes, retentarTudo, onMudanca } from '../offline/uploadQueue'
import type { UploadPendente } from '../offline/db'

/**
 * Diagnóstico da fila de envio.
 *
 * Existe para tornar VISÍVEL o que antes era invisível: quando um registro
 * (foto ou vídeo) não sobe, aqui aparece o status e o erro EXATO que o
 * servidor/app devolveu. Sem isto, um vídeo que falha "some" sem explicação —
 * e diagnosticar exigia o console do navegador.
 */
export function DiagnosticoFila() {
  const [itens, setItens] = useState<UploadPendente[]>([])
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    const carregar = () => { void pendentes().then(setItens) }
    carregar()
    return onMudanca(carregar)
  }, [])

  if (itens.length === 0) return null

  const comErro = itens.filter((i) => i.status === 'falhou' || i.status === 'bloqueado')

  return (
    <div className="card pad" style={{ marginTop: 12 }}>
      <button
        onClick={() => setAberto((v) => !v)}
        style={{
          background: 'none', border: 'none', width: '100%', padding: 0,
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          color: 'inherit', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <IconAlertTriangle size={16} stroke={2} style={{ color: comErro.length ? '#E8734A' : 'var(--muted)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
          Fila de envio: {itens.length} pendente{itens.length > 1 ? 's' : ''}
          {comErro.length > 0 && ` · ${comErro.length} com erro`}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{aberto ? 'ocultar' : 'ver'}</span>
      </button>

      {aberto && (
        <div style={{ marginTop: 12 }}>
          {itens.map((i) => (
            <div key={i.id} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '10px 0', borderTop: '1px solid var(--borda, rgba(0,0,0,.08))',
            }}>
              {i.videoBlob ? <IconVideo size={16} stroke={2} style={{ marginTop: 2, flexShrink: 0 }} />
                           : <IconPhoto size={16} stroke={2} style={{ marginTop: 2, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {i.videoBlob ? 'Vídeo' : 'Foto'} · {i.picoId}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                  {rotuloStatus(i.status)}
                  {i.videoBlob && ` · clipe ${(i.videoBlob.size / 1024 / 1024).toFixed(1)} MB`}
                </div>
                {i.erro && (
                  <div style={{
                    fontSize: 11, color: '#c0392b', marginTop: 4,
                    background: 'rgba(232,74,74,.08)', padding: '6px 8px', borderRadius: 6,
                    wordBreak: 'break-word',
                  }}>
                    {i.erro}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn full" onClick={() => void retentarTudo()}>
              <IconRefresh size={15} stroke={2} /> Tentar enviar tudo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function rotuloStatus(s: UploadPendente['status']): string {
  switch (s) {
    case 'na-fila': return 'Na fila, aguardando envio'
    case 'enviando': return 'Enviando…'
    case 'enviado': return 'Enviado ✓'
    case 'falhou': return 'Falhou — vai tentar de novo'
    case 'bloqueado': return 'Bloqueado — precisa de ação'
    default: return s
  }
}
