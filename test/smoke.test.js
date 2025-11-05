// test/smoke.test.js
// Simple test to verify test setup is working correctly

import { describe, it, expect, vi, beforeAll } from 'vitest'

describe('Environment Check', () => {
  it('should have jsdom environment loaded', () => {
    expect(typeof window).toBe('object')
    expect(window).toBeDefined()
    expect(typeof document).toBe('object')
    expect(document).toBeDefined()
  })

  it('should have DOM APIs available', () => {
    expect(document.createElement).toBeDefined()
    expect(document.querySelector).toBeDefined()
  })
})

describe('Test Setup Verification', () => {
  beforeAll(() => {
    // Verify window is available before running tests
    if (typeof window === 'undefined') {
      throw new Error('window is not defined - jsdom not loaded properly')
    }
  })

  it('should have access to vitest functions', () => {
    expect(describe).toBeDefined()
    expect(it).toBeDefined()
    expect(expect).toBeDefined()
    expect(vi).toBeDefined()
  })

  it('should have crypto API mocked', () => {
    expect(window).toBeDefined()
    expect(window.crypto).toBeDefined()
    expect(window.crypto.getRandomValues).toBeDefined()
    
    const arr = new Uint8Array(10)
    window.crypto.getRandomValues(arr)
    
    // Should have filled the array
    expect(arr.some(x => x !== 0)).toBe(true)
  })

  it('should have localStorage available', () => {
    expect(window.localStorage).toBeDefined()
    expect(window.localStorage.setItem).toBeDefined()
    expect(window.localStorage.getItem).toBeDefined()
    
    window.localStorage.setItem('test', 'value')
    expect(window.localStorage.getItem('test')).toBe('value')
  })

  it('should have sessionStorage available', () => {
    expect(window.sessionStorage).toBeDefined()
    expect(window.sessionStorage.setItem).toBeDefined()
    expect(window.sessionStorage.getItem).toBeDefined()
    
    window.sessionStorage.setItem('test', 'value')
    expect(window.sessionStorage.getItem('test')).toBe('value')
  })

  it('should have URL API available', () => {
    expect(window.URL).toBeDefined()
    expect(window.URL.createObjectURL).toBeDefined()
    expect(window.URL.revokeObjectURL).toBeDefined()
    
    // Create a proper Blob for testing
    const blob = new Blob(['test'], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    expect(url).toBeTruthy()
    expect(typeof url).toBe('string')
  })

  it('should have FileReader available', () => {
    expect(window.FileReader).toBeDefined()
    
    const reader = new window.FileReader()
    expect(reader).toBeInstanceOf(window.FileReader)
    expect(reader.readAsDataURL).toBeDefined()
  })

  it('should have Worker available', () => {
    expect(window.Worker).toBeDefined()
    
    const worker = new window.Worker('test-worker.js')
    expect(worker).toBeInstanceOf(window.Worker)
    expect(worker.postMessage).toBeDefined()
  })

  it('should have IntersectionObserver available', () => {
    expect(window.IntersectionObserver).toBeDefined()
    
    const observer = new window.IntersectionObserver(() => {})
    expect(observer).toBeInstanceOf(window.IntersectionObserver)
  })

  it('should have ResizeObserver available', () => {
    expect(window.ResizeObserver).toBeDefined()
    
    const observer = new window.ResizeObserver(() => {})
    expect(observer).toBeInstanceOf(window.ResizeObserver)
  })

  it('should clean up localStorage between tests', () => {
    // This test verifies that afterEach cleanup works
    // Previous test set 'test' key, it should be cleared now
    expect(window.localStorage.getItem('test')).toBeNull()
  })

  it('should work with basic assertions', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toContain('ello')
    expect([1, 2, 3]).toHaveLength(3)
    expect({ a: 1 }).toHaveProperty('a')
  })

  it('should work with async operations', async () => {
    const promise = Promise.resolve('success')
    await expect(promise).resolves.toBe('success')
  })

  it('should work with mock functions', () => {
    const mockFn = vi.fn()
    mockFn('test')
    
    expect(mockFn).toHaveBeenCalled()
    expect(mockFn).toHaveBeenCalledWith('test')
  })
})
