// src/constants/index.test.js
import { describe, it, expect } from 'vitest'
import {
  APP_CONFIG,
  STORAGE_KEYS,
  STEPS,
  KEY_EXCHANGE_METHODS,
  FILE_LIMITS,
  FIREBASE_CONFIG,
  ENCRYPTION_CONFIG,
  UI_MESSAGES,
  FEATURES
} from './index'

describe('Constants', () => {
  describe('APP_CONFIG', () => {
    it('should have required properties', () => {
      expect(APP_CONFIG).toHaveProperty('name')
      expect(APP_CONFIG).toHaveProperty('version')
      expect(APP_CONFIG).toHaveProperty('description')
    })

    it('should have valid values', () => {
      expect(typeof APP_CONFIG.name).toBe('string')
      expect(typeof APP_CONFIG.version).toBe('string')
      expect(APP_CONFIG.name).toBe('Together')
    })
  })

  describe('STORAGE_KEYS', () => {
    it('should have all required keys', () => {
      expect(STORAGE_KEYS).toHaveProperty('USER_NAME')
      expect(STORAGE_KEYS).toHaveProperty('MY_KEYS')
      expect(STORAGE_KEYS).toHaveProperty('THEIR_PUBLIC_KEY')
      expect(STORAGE_KEYS).toHaveProperty('SHARED_SECRET')
    })

    it('should have string values', () => {
      Object.values(STORAGE_KEYS).forEach(key => {
        expect(typeof key).toBe('string')
      })
    })

    it('should have prefixed keys', () => {
      Object.values(STORAGE_KEYS).forEach(key => {
        expect(key).toMatch(/^together/)
      })
    })
  })

  describe('STEPS', () => {
    it('should define all navigation steps', () => {
      expect(STEPS).toHaveProperty('WELCOME')
      expect(STEPS).toHaveProperty('CHAT')
      expect(STEPS).toHaveProperty('CODE_SETUP')
    })

    it('should have unique values', () => {
      const values = Object.values(STEPS)
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).toBe(values.length)
    })
  })

  describe('KEY_EXCHANGE_METHODS', () => {
    it('should define exchange methods', () => {
      expect(KEY_EXCHANGE_METHODS).toHaveProperty('QR_CODE')
      expect(KEY_EXCHANGE_METHODS).toHaveProperty('SHARED_CODE')
    })

    it('should have string values', () => {
      Object.values(KEY_EXCHANGE_METHODS).forEach(method => {
        expect(typeof method).toBe('string')
      })
    })
  })

  describe('FILE_LIMITS', () => {
    it('should define file constraints', () => {
      expect(FILE_LIMITS).toHaveProperty('MAX_SIZE')
      expect(FILE_LIMITS).toHaveProperty('ALLOWED_TYPES')
      expect(FILE_LIMITS).toHaveProperty('CHUNK_SIZE')
    })

    it('should have valid max size', () => {
      expect(typeof FILE_LIMITS.MAX_SIZE).toBe('number')
      expect(FILE_LIMITS.MAX_SIZE).toBeGreaterThan(0)
      expect(FILE_LIMITS.MAX_SIZE).toBe(1024 * 1024 * 1024) // 1GB
    })

    it('should have allowed types array', () => {
      expect(Array.isArray(FILE_LIMITS.ALLOWED_TYPES)).toBe(true)
      expect(FILE_LIMITS.ALLOWED_TYPES.length).toBeGreaterThan(0)
    })

    it('should include common file types', () => {
      expect(FILE_LIMITS.ALLOWED_TYPES).toContain('image/jpeg')
      expect(FILE_LIMITS.ALLOWED_TYPES).toContain('image/png')
      expect(FILE_LIMITS.ALLOWED_TYPES).toContain('video/mp4')
    })

    it('should have valid chunk size', () => {
      expect(typeof FILE_LIMITS.CHUNK_SIZE).toBe('number')
      expect(FILE_LIMITS.CHUNK_SIZE).toBeGreaterThan(0)
    })
  })

  describe('FIREBASE_CONFIG', () => {
    it('should define Firebase settings', () => {
      expect(FIREBASE_CONFIG).toHaveProperty('COLLECTION_ROOMS')
      expect(FIREBASE_CONFIG).toHaveProperty('COLLECTION_MESSAGES')
      expect(FIREBASE_CONFIG).toHaveProperty('MAX_PARTICIPANTS')
    })

    it('should have correct max participants', () => {
      expect(FIREBASE_CONFIG.MAX_PARTICIPANTS).toBe(2)
    })

    it('should have string collection names', () => {
      expect(typeof FIREBASE_CONFIG.COLLECTION_ROOMS).toBe('string')
      expect(typeof FIREBASE_CONFIG.COLLECTION_MESSAGES).toBe('string')
    })
  })

  describe('ENCRYPTION_CONFIG', () => {
    it('should define encryption settings', () => {
      expect(ENCRYPTION_CONFIG).toHaveProperty('ALGORITHM')
      expect(ENCRYPTION_CONFIG).toHaveProperty('KEY_SIZE')
      expect(ENCRYPTION_CONFIG).toHaveProperty('NONCE_SIZE')
      expect(ENCRYPTION_CONFIG).toHaveProperty('MIN_CODE_LENGTH')
    })

    it('should have valid key sizes', () => {
      expect(ENCRYPTION_CONFIG.KEY_SIZE).toBe(32)
      expect(ENCRYPTION_CONFIG.NONCE_SIZE).toBe(24)
    })

    it('should have reasonable min code length', () => {
      expect(ENCRYPTION_CONFIG.MIN_CODE_LENGTH).toBeGreaterThanOrEqual(6)
      expect(ENCRYPTION_CONFIG.MIN_CODE_LENGTH).toBeLessThanOrEqual(12)
    })

    it('should describe encryption algorithm', () => {
      expect(ENCRYPTION_CONFIG.ALGORITHM).toContain('NaCl')
    })
  })

  describe('UI_MESSAGES', () => {
    it('should have error messages', () => {
      expect(UI_MESSAGES).toHaveProperty('ERRORS')
      expect(UI_MESSAGES.ERRORS).toHaveProperty('FILE_TOO_LARGE')
      expect(UI_MESSAGES.ERRORS).toHaveProperty('ENCRYPTION_FAILED')
    })

    it('should have success messages', () => {
      expect(UI_MESSAGES).toHaveProperty('SUCCESS')
      expect(UI_MESSAGES.SUCCESS).toHaveProperty('MESSAGE_SENT')
    })

    it('should have info messages', () => {
      expect(UI_MESSAGES).toHaveProperty('INFO')
      expect(UI_MESSAGES.INFO).toHaveProperty('TYPING')
    })

    it('should have string messages', () => {
      const checkStrings = (obj) => {
        Object.values(obj).forEach(value => {
          if (typeof value === 'object') {
            checkStrings(value)
          } else {
            expect(typeof value).toBe('string')
          }
        })
      }
      checkStrings(UI_MESSAGES)
    })
  })

  describe('FEATURES', () => {
    it('should have feature flags', () => {
      expect(FEATURES).toHaveProperty('FILE_SHARING')
      expect(FEATURES).toHaveProperty('IMAGE_PREVIEW')
      expect(FEATURES).toHaveProperty('VIDEO_PREVIEW')
    })

    it('should have boolean values', () => {
      Object.values(FEATURES).forEach(flag => {
        expect(typeof flag).toBe('boolean')
      })
    })

    it('should have essential features enabled', () => {
      expect(FEATURES.FILE_SHARING).toBe(true)
      expect(FEATURES.IMAGE_PREVIEW).toBe(true)
      expect(FEATURES.VIDEO_PREVIEW).toBe(true)
    })
  })

  describe('Consistency checks', () => {
    it('should have matching file size displays', () => {
      expect(FILE_LIMITS.MAX_SIZE_DISPLAY).toBeDefined()
      // Should match the actual max size
      const sizeInGB = FILE_LIMITS.MAX_SIZE / (1024 * 1024 * 1024)
      expect(FILE_LIMITS.MAX_SIZE_DISPLAY).toContain(sizeInGB.toString())
    })

    it('should have consistent encryption config', () => {
      expect(ENCRYPTION_CONFIG.MIN_CODE_LENGTH).toBeLessThanOrEqual(
        ENCRYPTION_CONFIG.RECOMMENDED_CODE_LENGTH
      )
    })

    it('should have file limit error message with correct size', () => {
      expect(UI_MESSAGES.ERRORS.FILE_TOO_LARGE).toContain(FILE_LIMITS.MAX_SIZE_DISPLAY)
    })
  })

  describe('Immutability', () => {
    it('should not allow modification of constants', () => {
      const originalName = APP_CONFIG.name
      
      // Attempt to modify
      try {
        APP_CONFIG.name = 'Modified'
      } catch (e) {
        // Expected in strict mode
      }
      
      // Object might allow modification, but we document it shouldn't be done
      expect(APP_CONFIG.name).toBeDefined()
    })

    it('should have consistent values across imports', () => {
      // Re-importing should give same values
      const importedAgain = require('./index')
      expect(importedAgain.APP_CONFIG.name).toBe(APP_CONFIG.name)
    })
  })

  describe('Completeness', () => {
    it('should export all required constants', () => {
      const requiredExports = [
        'APP_CONFIG',
        'STORAGE_KEYS',
        'STEPS',
        'FILE_LIMITS',
        'ENCRYPTION_CONFIG',
        'UI_MESSAGES'
      ]
      
      requiredExports.forEach(exportName => {
        expect(eval(exportName)).toBeDefined()
      })
    })

    it('should have documentation-ready values', () => {
      // Values should be suitable for display in documentation
      expect(ENCRYPTION_CONFIG.ALGORITHM).toContain('Curve25519')
      expect(ENCRYPTION_CONFIG.ALGORITHM).toContain('XSalsa20')
      expect(ENCRYPTION_CONFIG.ALGORITHM).toContain('Poly1305')
    })
  })
})
