import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon_ecosurf.svg', 'atalho_icone_celular.png', 'og.png', 'logo_ecosurf.png'],
      manifest: {
        name: 'Ecosurf',
        short_name: 'Ecosurf',
        description: 'Radar de surf colaborativo e cartografia socioambiental do litoral brasileiro.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F5FAFC',
        theme_color: '#0A3A4C',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Handlers de push (notificação com o app fechado). Fora do bundle:
        // roda no service worker, não na página.
        importScripts: ['/sw-push.js'],
        globPatterns: ['**/*.{js,css,html,woff2}'],
        runtimeCaching: [
          {
            // tiles/estilo do mapa (CARTO dark-matter): cache do litoral do usuário
            urlPattern: ({ url }) =>
              url.host.endsWith('basemaps.cartocdn.com') || url.host === 'tiles.openfreemap.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'mapa-tiles',
              expiration: { maxEntries: 800, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // forecast: rede primeiro, cai no cache se 3G falhar
            urlPattern: ({ url }) => url.host.endsWith('open-meteo.com'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'forecast',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 3 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { host: true, port: 5173 },
})
