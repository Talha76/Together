// test/mocks/megaStorage.js
import { vi } from 'vitest'

export const mockMegaStorage = {
  uploadFile: vi.fn((data, fileName, onProgress, abortSignal) => {
    return new Promise((resolve) => {
      // Simulate progress
      if (onProgress) {
        onProgress(50)
        onProgress(100)
      }
      
      resolve({
        success: true,
        link: 'https://mega.nz/file/mock-file-id',
        size: data.length
      })
    })
  }),
  
  downloadFile: vi.fn((link, onProgress, abortSignal) => {
    return new Promise((resolve) => {
      // Simulate progress
      if (onProgress) {
        onProgress(50)
        onProgress(100)
      }
      
      resolve({
        success: true,
        data: 'bW9jay1lbmNyeXB0ZWQtZGF0YQ==', // base64 'mock-encrypted-data'
        size: 1024
      })
    })
  }),
  
  ensureReady: vi.fn(() => Promise.resolve({}))
}

export const megaStorage = mockMegaStorage

// Mock megajs module
vi.mock('megajs', () => ({
  Storage: class MockStorage {
    constructor() {
      this.ready = Promise.resolve()
    }
    on(event, callback) {
      if (event === 'ready') {
        setTimeout(callback, 0)
      }
    }
    upload(options) {
      return {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn((event, callback) => {
          if (event === 'complete') {
            setTimeout(() => callback({ link: () => 'https://mega.nz/mock' }), 0)
          }
        }),
        destroy: vi.fn(),
        off: vi.fn()
      }
    }
  },
  File: {
    fromURL: vi.fn(() => ({
      loadAttributes: vi.fn(() => Promise.resolve()),
      size: 1024,
      download: vi.fn(() => ({
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            callback(new Uint8Array([1, 2, 3, 4]))
          } else if (event === 'end') {
            setTimeout(callback, 0)
          }
        }),
        destroy: vi.fn(),
        off: vi.fn()
      }))
    }))
  }
}))
