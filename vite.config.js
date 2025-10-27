import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Together - Private Chat',
        short_name: 'Together',
        description: 'End-to-end encrypted messaging for couples',
        theme_color: '#ec4899',
        background_color: '#fdf2f8',
        
        // CRITICAL: This removes the address bar
        display: 'standalone',
        
        // Alternative options (try if standalone doesn't work):
        // display: 'fullscreen', // Full immersive mode
        // display: 'minimal-ui', // Minimal browser UI
        
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        
        // iOS specific
        prefer_related_applications: false,
        
        // Categories
        categories: ['social', 'communication'],
        
        // Screenshots for app store preview
        screenshots: [
          {
            src: 'screenshot1.png',
            sizes: '540x720',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
