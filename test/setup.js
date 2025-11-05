// test/setup.js
import { expect, afterEach, vi, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Cleanup after each test
afterEach(() => {
  cleanup()
  if (typeof window !== 'undefined') {
    window.localStorage.clear()
    window.sessionStorage.clear()
  }
})

// Mock Web Crypto API
if (typeof window !== 'undefined' && typeof window.crypto === 'undefined') {
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256)
        }
        return arr
      },
      subtle: {
        digest: async (algorithm, data) => {
          // Mock SHA-256 hash
          const hash = new Uint8Array(32)
          const dataArray = new Uint8Array(data)
          for (let i = 0; i < 32; i++) {
            hash[i] = dataArray[i % dataArray.length]
          }
          return hash.buffer
        }
      }
    },
    writable: true,
    configurable: true
  })
}

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// Mock IntersectionObserver
if (typeof window !== 'undefined') {
  window.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return []
    }
    unobserve() {}
  }
}

// Mock ResizeObserver
if (typeof window !== 'undefined') {
  window.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  }
}

// Enhance URL.createObjectURL (jsdom has basic implementation)
if (typeof window !== 'undefined' && typeof window.URL !== 'undefined') {
  const originalCreateObjectURL = window.URL.createObjectURL
  const originalRevokeObjectURL = window.URL.revokeObjectURL
  
  window.URL.createObjectURL = vi.fn((blob) => {
    // Return mock URL for non-blob objects in tests
    if (blob && typeof blob === 'object') {
      return 'mock-url-' + Math.random().toString(36).substr(2, 9)
    }
    return originalCreateObjectURL ? originalCreateObjectURL(blob) : 'mock-url'
  })
  
  window.URL.revokeObjectURL = vi.fn((url) => {
    if (originalRevokeObjectURL) {
      originalRevokeObjectURL(url)
    }
  })
}

// Mock FileReader with proper event handling
if (typeof window !== 'undefined') {
  const OriginalFileReader = window.FileReader
  
  window.FileReader = class FileReader extends EventTarget {
    constructor() {
      super()
      this.result = null
      this.error = null
      this.readyState = 0
      this.onload = null
      this.onerror = null
      this.onprogress = null
      this.onloadstart = null
      this.onloadend = null
    }
    
    readAsDataURL(blob) {
      this.readyState = 1
      setTimeout(() => {
        this.result = 'data:image/png;base64,mock'
        this.readyState = 2
        if (this.onload) {
          this.onload({ target: this })
        }
        this.dispatchEvent(new Event('load'))
      }, 0)
    }
    
    readAsText(blob) {
      this.readyState = 1
      setTimeout(() => {
        this.result = 'mock text'
        this.readyState = 2
        if (this.onload) {
          this.onload({ target: this })
        }
        this.dispatchEvent(new Event('load'))
      }, 0)
    }
    
    readAsArrayBuffer(blob) {
      this.readyState = 1
      setTimeout(() => {
        this.result = new ArrayBuffer(8)
        this.readyState = 2
        if (this.onload) {
          this.onload({ target: this })
        }
        this.dispatchEvent(new Event('load'))
      }, 0)
    }
    
    abort() {
      this.readyState = 2
    }
  }
}

// Mock Worker
if (typeof window !== 'undefined') {
  window.Worker = class Worker extends EventTarget {
    constructor(stringUrl) {
      super()
      this.url = stringUrl
      this.onmessage = null
      this.onerror = null
    }
    
    postMessage(msg) {
      // Mock worker response
      setTimeout(() => {
        const event = new MessageEvent('message', {
          data: {
            type: 'complete',
            id: msg.id,
            result: { success: true, data: 'mock-encrypted-data' }
          }
        })
        
        if (this.onmessage) {
          this.onmessage(event)
        }
        this.dispatchEvent(event)
      }, 0)
    }
    
    terminate() {}
  }
}

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
       args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Not implemented: HTMLCanvasElement.prototype.getContext'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

export { vi }
