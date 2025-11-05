// src/encryption.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateKeyPair,
  generateSharedSecret,
  deriveKeyPairFromCode,
  encryptMessage,
  decryptMessage,
  encryptFile,
  decryptFile
} from './encryption'

describe('Encryption Module', () => {
  describe('generateKeyPair', () => {
    it('should generate a valid key pair', () => {
      const keyPair = generateKeyPair()
      
      expect(keyPair).toHaveProperty('publicKey')
      expect(keyPair).toHaveProperty('secretKey')
      expect(typeof keyPair.publicKey).toBe('string')
      expect(typeof keyPair.secretKey).toBe('string')
      expect(keyPair.publicKey.length).toBeGreaterThan(0)
      expect(keyPair.secretKey.length).toBeGreaterThan(0)
    })

    it('should generate unique key pairs', () => {
      const keyPair1 = generateKeyPair()
      const keyPair2 = generateKeyPair()
      
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey)
      expect(keyPair1.secretKey).not.toBe(keyPair2.secretKey)
    })
  })

  describe('generateSharedSecret', () => {
    it('should generate a shared secret', () => {
      const alice = generateKeyPair()
      const bob = generateKeyPair()
      
      const aliceSecret = generateSharedSecret(alice.secretKey, bob.publicKey)
      const bobSecret = generateSharedSecret(bob.secretKey, alice.publicKey)
      
      expect(aliceSecret).toBe(bobSecret)
      expect(typeof aliceSecret).toBe('string')
      expect(aliceSecret.length).toBeGreaterThan(0)
    })
  })

  describe('deriveKeyPairFromCode', () => {
    it('should derive deterministic keys from code', async () => {
      const code = 'test-shared-code-123'
      
      const keyPair1 = await deriveKeyPairFromCode(code)
      const keyPair2 = await deriveKeyPairFromCode(code)
      
      expect(keyPair1.publicKey).toBe(keyPair2.publicKey)
      expect(keyPair1.secretKey).toBe(keyPair2.secretKey)
    })

    it('should generate different keys for different codes', async () => {
      const keyPair1 = await deriveKeyPairFromCode('code1')
      const keyPair2 = await deriveKeyPairFromCode('code2')
      
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey)
      expect(keyPair1.secretKey).not.toBe(keyPair2.secretKey)
    })

    it('should handle short codes', async () => {
      const keyPair = await deriveKeyPairFromCode('abc')
      
      expect(keyPair).toHaveProperty('publicKey')
      expect(keyPair).toHaveProperty('secretKey')
    })
  })

  describe('encryptMessage and decryptMessage', () => {
    let sharedSecret

    beforeEach(() => {
      // Generate two separate key pairs for proper shared secret
      const alice = generateKeyPair()
      const bob = generateKeyPair()
      sharedSecret = generateSharedSecret(alice.secretKey, bob.publicKey)
    })

    it('should encrypt and decrypt a message', () => {
      const message = 'Hello, World!'
      
      const encrypted = encryptMessage(message, sharedSecret)
      expect(encrypted).toHaveProperty('nonce')
      expect(encrypted).toHaveProperty('ciphertext')
      
      const decrypted = decryptMessage(encrypted, sharedSecret)
      expect(decrypted).toBe(message)
    })

    it('should handle empty messages', () => {
      const message = ''
      
      const encrypted = encryptMessage(message, sharedSecret)
      const decrypted = decryptMessage(encrypted, sharedSecret)
      
      expect(decrypted).toBe(message)
    })

    it('should handle unicode characters', () => {
      const message = 'Hello 世界 🌍 émoji'
      
      const encrypted = encryptMessage(message, sharedSecret)
      const decrypted = decryptMessage(encrypted, sharedSecret)
      
      expect(decrypted).toBe(message)
    })

    it('should return null for invalid decryption', () => {
      const encrypted = {
        nonce: 'invalid-nonce',
        ciphertext: 'invalid-ciphertext'
      }
      
      const decrypted = decryptMessage(encrypted, sharedSecret)
      expect(decrypted).toBeNull()
    })

    it('should generate unique nonces', () => {
      const message = 'Test'
      
      const encrypted1 = encryptMessage(message, sharedSecret)
      const encrypted2 = encryptMessage(message, sharedSecret)
      
      expect(encrypted1.nonce).not.toBe(encrypted2.nonce)
    })
  })

  describe('encryptFile and decryptFile', () => {
    let sharedSecret

    beforeEach(async () => {
      const keyPair = await deriveKeyPairFromCode('test-code-456')
      sharedSecret = generateSharedSecret(keyPair.secretKey, keyPair.publicKey)
    })

    it('should encrypt and decrypt file data', () => {
      const fileData = btoa('mock file content')
      const onProgress = vi.fn()
      
      const encrypted = encryptFile(fileData, sharedSecret, onProgress)
      
      expect(encrypted).toHaveProperty('chunks')
      expect(encrypted).toHaveProperty('totalSize')
      expect(Array.isArray(encrypted.chunks)).toBe(true)
      expect(encrypted.chunks.length).toBeGreaterThan(0)
      expect(onProgress).toHaveBeenCalled()
      
      const decrypted = decryptFile(encrypted.chunks, sharedSecret, onProgress)
      
      expect(decrypted).toBe(fileData)
      expect(onProgress).toHaveBeenCalledTimes(2) // once for encrypt, once for decrypt
    })

    it('should handle large files with multiple chunks', () => {
      // Create a large file (>1MB)
      const largeData = btoa('x'.repeat(2 * 1024 * 1024)) // 2MB
      
      const encrypted = encryptFile(largeData, sharedSecret)
      
      expect(encrypted.chunks.length).toBeGreaterThan(1)
    })

    it('should throw error without encryption key', () => {
      const fileData = btoa('test')
      
      expect(() => encryptFile(fileData, null)).toThrow()
    })

    it('should report progress during encryption', () => {
      const fileData = btoa('test data')
      const onProgress = vi.fn()
      
      encryptFile(fileData, sharedSecret, onProgress)
      
      expect(onProgress).toHaveBeenCalled()
      expect(onProgress.mock.calls[0][0]).toBeGreaterThan(0)
    })
  })
})
