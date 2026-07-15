// @ts-expect-error — virtual module provided by vite-plugin-pwa at build time
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Banner flutuante que aparece quando o Service Worker detecta uma nova versão
 * do app. O usuário pode atualizar imediatamente ou dispensar.
 * A verificação ocorre a cada 60s em background.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url: string, registration: ServiceWorkerRegistration | undefined) {
      if (registration) {
        // Checa nova versão logo ao abrir e a cada 60s — no PWA do iOS a
        // verificação espontânea é preguiçosa; forçamos na mão.
        registration.update()
        setInterval(() => { registration.update() }, 60_000)
      }
      // Com autoUpdate + skipWaiting, o SW novo assume o controle sozinho.
      // Ao assumir, recarrega uma vez para a build nova aparecer sem depender
      // de o usuário tocar em nada — foi o que deixava gente presa no cache.
      if ('serviceWorker' in navigator) {
        let recarregou = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (recarregou) return
          recarregou = true
          window.location.reload()
        })
      }
    },
  })

  if (!needRefresh) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'var(--azul-abissal, #0a3a4c)',
        color: '#fff',
        borderRadius: 14,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,.35)',
        fontSize: 14,
        maxWidth: 'calc(100vw - 32px)',
        animation: 'slideUp .3s ease-out',
      }}
    >
      <span style={{ flex: 1 }}>🆕 Nova versão disponível!</span>
      <button
        onClick={() => {
          updateServiceWorker(true)
          // Fallback: se o SW não recarregou em 2s, forçar reload
          setTimeout(() => window.location.reload(), 2000)
        }}
        style={{
          background: 'var(--azul, #1c8aad)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '6px 14px',
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          fontSize: 13,
        }}
      >
        Atualizar
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,.6)',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          padding: '0 4px',
        }}
        aria-label="Fechar"
      >
        ✕
      </button>
    </div>
  )
}
