import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconWifiOff, IconAlertTriangle, IconX } from '@tabler/icons-react'
import { useUploads } from '../offline/useUploads'
import { limparBloqueados, retentarTudo } from '../offline/uploadQueue'

/** Estado de rede + fila de upload sempre visível quando relevante. */
export function UploadStatusBar() {
  const uploads = useUploads()
  const navigate = useNavigate()
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const naFila = uploads.filter((u) => u.status === 'na-fila' || u.status === 'falhou').length
  const enviando = uploads.filter((u) => u.status === 'enviando').length
  const bloqueados = uploads.filter((u) => u.status === 'bloqueado')
  const erroBloqueio = bloqueados[0]?.erro

  // Barra de bloqueio (erro de auth) — tem prioridade visual
  if (bloqueados.length > 0) {
    return (
      <div
        role="alert"
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 'var(--largura-app)',
          zIndex: 60,
          background: 'var(--perigo)',
          color: '#fff',
          fontSize: 12.5,
          fontWeight: 600,
          padding: 'calc(env(safe-area-inset-top,0px) + 8px) 14px 8px',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <IconAlertTriangle size={14} stroke={2.2} />
          <span>{bloqueados.length} foto(s) não enviada(s)</span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.9, marginTop: 2 }}>
          {erroBloqueio ?? 'Erro de autenticação'}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6 }}>
          <button
            onClick={() => navigate('/perfil')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 8,
              padding: '4px 12px',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Fazer login
          </button>
          <button
            onClick={() => void retentarTudo()}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 8,
              padding: '4px 12px',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Tentar novamente
          </button>
          <button
            onClick={() => void limparBloqueados()}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 8,
              padding: '4px 12px',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <IconX size={11} stroke={2.5} /> Limpar fila
          </button>
        </div>
      </div>
    )
  }

  if (online && naFila === 0 && enviando === 0) return null

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 'var(--largura-app)',
        zIndex: 60,
        background: online ? 'var(--azul-abissal)' : 'var(--perigo)',
        color: '#fff',
        fontSize: 12.5,
        fontWeight: 600,
        padding: 'calc(env(safe-area-inset-top,0px) + 6px) 14px 6px',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      {!online && <IconWifiOff size={14} stroke={2.2} />}
      {!online && 'Sem conexão · '}
      {enviando > 0 && `enviando ${enviando} foto(s)… `}
      {naFila > 0 && `${naFila} na fila`}
      {online && naFila === 0 && enviando > 0 && 'sincronizando…'}
    </div>
  )
}
