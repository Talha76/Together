import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
    environmentMatchGlobs: [
      // All test files use jsdom
      ['**/*.test.{js,jsx}', 'jsdom'],
      ['**/*.spec.{js,jsx}', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.js',
        '**/dist/**',
        '**/*.test.{js,jsx}',
        '**/index.jsx'
      ]
    },
    include: ['**/*.{test,spec}.{js,jsx}'],
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@utils': resolve(__dirname, './src/utils')
    }
  }
})
