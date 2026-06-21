import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Ecosurf',
        short_name: 'Ecosurf',
        description: 'Radar de surf colaborativo e cartografia socioambiental do litoral brasileiro.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#EEF3F7',
        theme_color: '#0C2A43',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        runtimeCaching: [
          {
            // tiles do mapa: cache do litoral local do usuário
            urlPattern: ({ url }) => url.host === 'tiles.openfreemap.org',
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
