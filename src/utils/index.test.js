// src/utils/index.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  formatFileSize,
  validateFile,
  getFileExtension,
  isImageFile,
  isVideoFile,
  formatTimestamp,
  generateRoomId,
  debounce,
  throttle,
  isMobile,
  isIOS,
  copyToClipboard,
  getGreeting,
  sanitizeFilename,
  generateSecureId,
  checkPasswordStrength,
  storage,
  formatPhoneNumber,
  truncate,
  parseError
} from './index'

describe('Utility Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('should handle decimal places', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB')
    })

    it('should handle large numbers', () => {
      expect(formatFileSize(10 * 1024 * 1024 * 1024)).toContain('GB')
    })
  })

  describe('validateFile', () => {
    it('should validate valid files', () => {
      const file = {
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg'
      }
      
      const result = validateFile(file)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject files that are too large', () => {
      const file = {
        size: 2 * 1024 * 1024 * 1024, // 2GB
        type: 'image/jpeg'
      }
      
      const result = validateFile(file)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject null file', () => {
      const result = validateFile(null)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('No file selected')
    })
  })

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('file.jpg')).toBe('jpg')
      expect(getFileExtension('document.pdf')).toBe('pdf')
      expect(getFileExtension('archive.tar.gz')).toBe('gz')
    })

    it('should handle files without extension', () => {
      expect(getFileExtension('README')).toBe('')
    })

    it('should be case insensitive', () => {
      expect(getFileExtension('FILE.JPG')).toBe('jpg')
    })
  })

  describe('isImageFile and isVideoFile', () => {
    it('should detect image files', () => {
      expect(isImageFile('image/jpeg')).toBe(true)
      expect(isImageFile('image/png')).toBe(true)
      expect(isImageFile('video/mp4')).toBe(false)
    })

    it('should detect video files', () => {
      expect(isVideoFile('video/mp4')).toBe(true)
      expect(isVideoFile('video/webm')).toBe(true)
      expect(isVideoFile('image/jpeg')).toBe(false)
    })
  })

  describe('formatTimestamp', () => {
    it('should format timestamps', () => {
      const now = new Date()
      const result = formatTimestamp(now.getTime())
      
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should show time for recent messages', () => {
      const now = new Date()
      const result = formatTimestamp(now.getTime())
      
      // Should contain time format like "12:00 PM"
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('generateRoomId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateRoomId()
      const id2 = generateRoomId()
      
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(id1.length).toBeGreaterThan(0)
    })
  })

  describe('debounce', () => {
    it('should debounce function calls', () => {
      vi.useFakeTimers()
      
      const func = vi.fn()
      const debounced = debounce(func, 100)
      
      debounced()
      debounced()
      debounced()
      
      expect(func).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(100)
      
      expect(func).toHaveBeenCalledTimes(1)
      
      vi.useRealTimers()
    })
  })

  describe('throttle', () => {
    it('should throttle function calls', () => {
      vi.useFakeTimers()
      
      const func = vi.fn()
      const throttled = throttle(func, 100)
      
      throttled()
      throttled()
      throttled()
      
      expect(func).toHaveBeenCalledTimes(1)
      
      vi.advanceTimersByTime(100)
      throttled()
      
      expect(func).toHaveBeenCalledTimes(2)
      
      vi.useRealTimers()
    })
  })

  describe('isMobile and isIOS', () => {
    it('should detect mobile devices', () => {
      const result = isMobile()
      expect(typeof result).toBe('boolean')
    })

    it('should detect iOS devices', () => {
      const result = isIOS()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('copyToClipboard', () => {
    it('should copy text to clipboard', async () => {
      const text = 'test text'
      const result = await copyToClipboard(text)
      
      expect(result).toHaveProperty('success')
    })
  })

  describe('getGreeting', () => {
    it('should return appropriate greeting', () => {
      const greeting = getGreeting()
      
      expect(greeting).toMatch(/Good (morning|afternoon|evening)/)
    })
  })

  describe('sanitizeFilename', () => {
    it('should sanitize filenames', () => {
      expect(sanitizeFilename('My File!@#.txt')).toBe('my_file___.txt')
      expect(sanitizeFilename('File  Name.pdf')).toBe('file_name.pdf')
    })

    it('should handle special characters', () => {
      const result = sanitizeFilename('file<>:"/\\|?*.txt')
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })
  })

  describe('generateSecureId', () => {
    it('should generate secure random IDs', () => {
      const id1 = generateSecureId()
      const id2 = generateSecureId()
      
      expect(id1).not.toBe(id2)
      expect(id1.length).toBe(32) // 16 bytes * 2 hex chars
    })

    it('should respect length parameter', () => {
      const id = generateSecureId(8)
      expect(id.length).toBe(16) // 8 bytes * 2 hex chars
    })
  })

  describe('checkPasswordStrength', () => {
    it('should check password strength', () => {
      const weak = checkPasswordStrength('abc')
      expect(weak.score).toBeLessThan(3)
      expect(weak.feedback.length).toBeGreaterThan(0)
      
      const strong = checkPasswordStrength('StrongP@ssw0rd123!')
      expect(strong.score).toBeGreaterThan(3)
    })

    it('should require minimum length', () => {
      const result = checkPasswordStrength('ab')
      expect(result.feedback[0]).toContain('Too short')
    })

    it('should reward complexity', () => {
      const simple = checkPasswordStrength('password')
      const complex = checkPasswordStrength('P@ssw0rd123!')
      
      expect(complex.score).toBeGreaterThan(simple.score)
    })
  })

  describe('storage helpers', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should set and get items', () => {
      storage.set('test', { value: 123 })
      const result = storage.get('test')
      
      expect(result).toEqual({ value: 123 })
    })

    it('should return default value for missing items', () => {
      const result = storage.get('nonexistent', 'default')
      expect(result).toBe('default')
    })

    it('should remove items', () => {
      storage.set('test', 'value')
      storage.remove('test')
      
      expect(storage.get('test')).toBeNull()
    })

    it('should clear all items', () => {
      storage.set('key1', 'value1')
      storage.set('key2', 'value2')
      storage.clear()
      
      expect(storage.get('key1')).toBeNull()
      expect(storage.get('key2')).toBeNull()
    })
  })

  describe('formatPhoneNumber', () => {
    it('should format US phone numbers', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890')
    })

    it('should return original for invalid numbers', () => {
      expect(formatPhoneNumber('123')).toBe('123')
    })
  })

  describe('truncate', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that needs truncating'
      const result = truncate(text, 20)
      
      expect(result.length).toBeLessThanOrEqual(23) // 20 + "..."
      expect(result).toContain('...')
    })

    it('should not truncate short text', () => {
      const text = 'Short'
      const result = truncate(text, 20)
      
      expect(result).toBe(text)
    })
  })

  describe('parseError', () => {
    it('should parse error objects', () => {
      const error = new Error('Test error')
      expect(parseError(error)).toBe('Test error')
    })

    it('should parse string errors', () => {
      expect(parseError('Error message')).toBe('Error message')
    })

    it('should parse objects with error property', () => {
      expect(parseError({ error: 'Custom error' })).toBe('Custom error')
    })

    it('should return default message for unknown errors', () => {
      expect(parseError({})).toBe('An unexpected error occurred')
    })
  })
})
