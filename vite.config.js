import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'
import viteCompression from 'vite-plugin-compression'

// Read version from package.json
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'))

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development'
  
  return {
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true
      }),
      
      // PWA Configuration
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
        
        devOptions: {
          enabled: isDev,
          type: 'module'
        },
        
        manifest: {
          name: 'Together - Private Chat',
          short_name: 'Together',
          description: 'End-to-end encrypted messaging app for couples with military-grade security',
          theme_color: '#ec4899',
          background_color: '#fdf2f8',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ],
          
          categories: ['social', 'communication', 'utilities'],
          screenshots: [
            {
              src: '/screenshots/chat.png',
              sizes: '540x720',
              type: 'image/png',
              label: 'Chat Interface'
            }
          ]
        },
        
        workbox: {
          // Cache strategy
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp,woff,woff2}'],
          
          // Don't cache these
          globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
          
          // Runtime caching
          runtimeCaching: [
            {
              // Cache Firebase Storage files
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firebase-storage',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // Cache Firebase API calls
              urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'firebase-api',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5 // 5 minutes
                }
              }
            },
            {
              // Cache images
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                }
              }
            }
          ],
          
          // Clean up outdated caches
          cleanupOutdatedCaches: true,
          
          // Skip waiting and claim clients immediately
          skipWaiting: true,
          clientsClaim: true
        }
      }),
      
      // Compression for production
      !isDev && viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240, // Only compress files larger than 10KB
        deleteOriginFile: false
      }),
      
      !isDev && viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
        deleteOriginFile: false
      })
    ].filter(Boolean),
    
    // Build optimizations
    build: {
      // Target modern browsers
      target: 'es2020',
      
      // Output directory
      outDir: 'dist',
      
      // Generate sourcemaps for debugging (disable in production)
      sourcemap: isDev,
      
      // Minification
      minify: isDev ? false : 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info']
        }
      },
      
      // Code splitting
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'firebase': ['firebase/app', 'firebase/firestore', 'firebase/storage'],
            'crypto': ['tweetnacl', 'tweetnacl-util'],
            'icons': ['lucide-react']
          },
          
          // Asset file naming
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.')
            const ext = info[info.length - 1]
            
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`
            } else if (/woff2?|ttf|otf|eot/i.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },
          
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js'
        }
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      
      // Asset inlining threshold
      assetsInlineLimit: 4096 // 4KB
    },
    
    // Development server
    server: {
      port: 3000,
      host: true,
      open: true,
      cors: true
    },
    
    // Preview server
    preview: {
      port: 4173,
      host: true
    },
    
    // Optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', 'tweetnacl', 'tweetnacl-util', 'lucide-react']
    },
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify('1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    }
  }
})
