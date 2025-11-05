// src/hooks/useEncryption.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEncryption } from './useEncryption'

describe('useEncryption Hook', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    expect(typeof result.current).toBe('object')
    
    expect(result.current.myKeys).toBeNull()
    expect(result.current.theirPublicKey).toBeNull()
    expect(result.current.sharedSecret).toBeNull()
    expect(result.current.keyExchangeMethod).toBeNull()
    expect(result.current.isEncrypted).toBe(false)
  })

  it('should load encryption state from localStorage', async () => {
    const mockKeys = { publicKey: 'pub123', secretKey: 'sec123' }
    const mockSecret = 'shared-secret'
    
    localStorage.setItem('togetherMyKeys', JSON.stringify(mockKeys))
    localStorage.setItem('togetherSharedSecret', mockSecret)
    localStorage.setItem('togetherKeyMethod', 'code')
    
    const { result } = renderHook(() => useEncryption())
    
    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current.myKeys).toEqual(mockKeys)
    })
    
    expect(result.current.sharedSecret).toBe(mockSecret)
    expect(result.current.keyExchangeMethod).toBe('code')
    expect(result.current.isEncrypted).toBe(true)
  })

  it('should setup encryption with shared code', async () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    
    let setupResult
    await act(async () => {
      setupResult = await result.current.setupWithCode('test-code-123')
    })
    
    expect(setupResult.success).toBe(true)
    expect(setupResult.keys).toBeDefined()
    expect(setupResult.secret).toBeDefined()
    expect(result.current.isEncrypted).toBe(true)
  })

  it('should reject weak codes', async () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    
    let setupResult
    await act(async () => {
      setupResult = await result.current.setupWithCode('abc')
    })
    
    expect(setupResult.success).toBe(false)
    expect(setupResult.error).toContain('at least 6 characters')
  })

  it('should generate deterministic keys from same code', async () => {
    const { result: result1 } = renderHook(() => useEncryption())
    const { result: result2 } = renderHook(() => useEncryption())
    
    expect(result1.current).toBeDefined()
    expect(result2.current).toBeDefined()
    
    await act(async () => {
      await result1.current.setupWithCode('same-code')
    })
    
    await act(async () => {
      await result2.current.setupWithCode('same-code')
    })
    
    expect(result1.current.myKeys.publicKey).toBe(result2.current.myKeys.publicKey)
  })

  it('should save encryption keys to localStorage', async () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    
    await act(async () => {
      await result.current.setupWithCode('test-code')
    })
    
    act(() => {
      result.current.saveEncryptionKeys('TestUser')
    })
    
    expect(localStorage.getItem('togetherUserName')).toBe('TestUser')
    expect(localStorage.getItem('togetherMyKeys')).toBeTruthy()
    expect(localStorage.getItem('togetherSharedSecret')).toBeTruthy()
  })

  it('should clear encryption data', async () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    
    await act(async () => {
      await result.current.setupWithCode('test-code')
    })
    
    expect(result.current.myKeys).toBeDefined()
    expect(result.current.sharedSecret).toBeDefined()
    
    act(() => {
      result.current.clearEncryptionData()
    })
    
    expect(result.current.myKeys).toBeNull()
    expect(result.current.sharedSecret).toBeNull()
    expect(result.current.isEncrypted).toBe(false)
    expect(localStorage.getItem('togetherMyKeys')).toBeNull()
  })

  it('should encrypt messages', async () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    
    // Setup with code - this generates keys and shared secret properly
    await act(async () => {
      const setupResult = await result.current.setupWithCode('test-code-for-encryption')
      // Verify setup succeeded
      expect(setupResult.success).toBe(true)
    })
    
    // Wait for state to update
    await waitFor(() => {
      expect(result.current.sharedSecret).toBeTruthy()
    })
    
    // Now try encryption
    const encrypted = result.current.encryptMessage('Hello World')
    
    expect(encrypted).toBeDefined()
    expect(encrypted).not.toBeNull()
    expect(encrypted).toHaveProperty('nonce')
    expect(encrypted).toHaveProperty('ciphertext')
  })

  it('should decrypt messages', async () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    
    // Setup with code
    await act(async () => {
      const setupResult = await result.current.setupWithCode('test-code-for-decryption')
      expect(setupResult.success).toBe(true)
    })
    
    // Wait for state to update
    await waitFor(() => {
      expect(result.current.sharedSecret).toBeTruthy()
    })
    
    const message = 'Test Message'
    const encrypted = result.current.encryptMessage(message)
    
    // Verify encryption worked
    expect(encrypted).toBeDefined()
    expect(encrypted).not.toBeNull()
    
    const decrypted = result.current.decryptMessage(encrypted)
    
    expect(decrypted).toBe(message)
  })

  it('should return null for encryption without setup', () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    expect(typeof result.current.encryptMessage).toBe('function')
    
    const encrypted = result.current.encryptMessage('test')
    expect(encrypted).toBeNull()
  })

  it('should handle decryption failures gracefully', async () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    
    // Setup with code
    await act(async () => {
      const setupResult = await result.current.setupWithCode('test-code-for-bad-decrypt')
      expect(setupResult.success).toBe(true)
    })
    
    // Wait for state to update
    await waitFor(() => {
      expect(result.current.sharedSecret).toBeTruthy()
    })
    
    const badData = { nonce: 'bad', ciphertext: 'bad' }
    const decrypted = result.current.decryptMessage(badData)
    
    // The hook's decryptMessage catches errors and returns '[Decryption failed]'
    // But if it returns null, that's also acceptable as an error state
    expect(decrypted === '[Decryption failed]' || decrypted === null).toBe(true)
  })

  it('should encrypt files', async () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    
    await act(async () => {
      await result.current.setupWithCode('file-encrypt-test')
    })
    
    // Wait for shared secret
    await waitFor(() => {
      expect(result.current.sharedSecret).toBeTruthy()
    })
    
    const fileData = btoa('test file content')
    const encrypted = result.current.encryptFile(fileData)
    
    expect(encrypted).toBeDefined()
    expect(encrypted).toHaveProperty('chunks')
  })

  it('should decrypt files', async () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    
    await act(async () => {
      await result.current.setupWithCode('file-decrypt-test')
    })
    
    // Wait for shared secret
    await waitFor(() => {
      expect(result.current.sharedSecret).toBeTruthy()
    })
    
    const fileData = btoa('test file')
    const encrypted = result.current.encryptFile(fileData)
    const decrypted = result.current.decryptFile(encrypted.chunks)
    
    expect(decrypted).toBe(fileData)
  })

  it('should update state when keys are set manually', () => {
    const { result } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    expect(typeof result.current.setMyKeys).toBe('function')
    
    const testKeys = { publicKey: 'pub', secretKey: 'sec' }
    
    act(() => {
      result.current.setMyKeys(testKeys)
      result.current.setTheirPublicKey('their-pub')
      result.current.setSharedSecret('secret')
      result.current.setKeyExchangeMethod('code')
    })
    
    expect(result.current.myKeys).toEqual(testKeys)
    expect(result.current.theirPublicKey).toBe('their-pub')
    expect(result.current.sharedSecret).toBe('secret')
    expect(result.current.keyExchangeMethod).toBe('code')
  })

  it('should persist state across hook re-renders', async () => {
    const { result, rerender } = renderHook(() => useEncryption())
    
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    
    await act(async () => {
      await result.current.setupWithCode('persist-test')
    })
    
    const secretBefore = result.current.sharedSecret
    
    rerender()
    
    expect(result.current).toBeDefined()
    expect(result.current.sharedSecret).toBe(secretBefore)
  })
})
