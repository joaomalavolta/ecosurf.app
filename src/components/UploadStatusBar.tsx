import { useEffect, useState } from 'react'
import { IconWifiOff } from '@tabler/icons-react'
import { useUploads } from '../offline/useUploads'

/** Estado de rede + fila de upload sempre visível quando relevante. */
export function UploadStatusBar() {
  const uploads = useUploads()
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
