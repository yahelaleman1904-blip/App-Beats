// draftea-beats-ai/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Draftea Beats AI',
        short_name: 'Beats AI',
        description: 'Motor Estadístico L10, Control de Rotaciones y Constructor de Beats',
        theme_color: '#0b0d13',
        background_color: '#0b0d13',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/5328/5328263.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Nunca guardar en caché viejo las respuestas en vivo de la API
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/media\.api-sports\.io\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'club-logos-cache',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 14 // 14 días para escudos
              }
            }
          }
        ]
      }
    })
  ],
})