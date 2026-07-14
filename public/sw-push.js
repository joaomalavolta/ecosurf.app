/* eslint-disable no-undef */
/**
 * Push do Ecosurf — importado pelo service worker gerado pelo Workbox
 * (vite.config.ts → workbox.importScripts).
 *
 * Este arquivo roda FORA do app: é o que permite avisar alguém que o mar
 * acendeu ou que apareceu esgoto na praia, mesmo com o Ecosurf fechado.
 * Por isso ele é minúsculo e sem dependências — precisa ser à prova de falha.
 */

self.addEventListener('push', (event) => {
  let dados = {}
  try {
    dados = event.data ? event.data.json() : {}
  } catch {
    dados = { titulo: 'Ecosurf', corpo: event.data ? event.data.text() : '' }
  }

  const titulo = dados.titulo || 'Ecosurf'
  const opcoes = {
    body: dados.corpo || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    // Agrupa por assunto: 10 fotos no mesmo pico não viram 10 notificações.
    tag: dados.tag || 'ecosurf',
    renotify: !!dados.renotify,
    data: { url: dados.url || '/' },
  }
  if (dados.imagem) opcoes.image = dados.imagem

  event.waitUntil(self.registration.showNotification(titulo, opcoes))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = (event.notification.data && event.notification.data.url) || '/'

  // Se o app já estiver aberto, navega a aba existente em vez de abrir outra.
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
      for (const aba of abas) {
        if ('focus' in aba) {
          if ('navigate' in aba) {
            return aba.navigate(destino).then((c) => c && c.focus())
          }
          return aba.focus()
        }
      }
      return self.clients.openWindow(destino)
    }),
  )
})
