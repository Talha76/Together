// src/userIdentifier.test.js
import { describe, it, expect } from 'vitest'
import {
  generateUserIdentifier,
  parseUserIdentifier,
  isSameUser,
  getDisplayName
} from './userIdentifier'

describe('User Identifier Module', () => {
  describe('generateUserIdentifier', () => {
    it('should generate a unique identifier from userName and code', async () => {
      const identifier = await generateUserIdentifier('Alice', 'secret123')
      
      expect(typeof identifier).toBe('string')
      expect(identifier).toContain('#')
      expect(identifier).toMatch(/^Alice#[a-f0-9]{8}$/)
    })

    it('should generate consistent identifiers for same inputs', async () => {
      const id1 = await generateUserIdentifier('Bob', 'password456')
      const id2 = await generateUserIdentifier('Bob', 'password456')
      
      expect(id1).toBe(id2)
    })

    it('should generate different identifiers for different codes', async () => {
      const id1 = await generateUserIdentifier('Alice', 'code1')
      const id2 = await generateUserIdentifier('Alice', 'code2')
      
      expect(id1).not.toBe(id2)
    })

    it('should generate different identifiers for different usernames', async () => {
      const id1 = await generateUserIdentifier('Alice', 'same-code')
      const id2 = await generateUserIdentifier('Bob', 'same-code')
      
      expect(id1).not.toBe(id2)
      expect(id1).toContain('Alice')
      expect(id2).toContain('Bob')
    })

    it('should handle special characters in userName', async () => {
      const identifier = await generateUserIdentifier('User_123', 'code')
      
      expect(identifier).toContain('User_123')
      expect(identifier).toContain('#')
    })

    it('should handle unicode characters', async () => {
      const identifier = await generateUserIdentifier('用户', 'code')
      
      expect(identifier).toContain('用户')
    })
  })

  describe('parseUserIdentifier', () => {
    it('should parse valid identifier', () => {
      const result = parseUserIdentifier('Alice#a3f2d9e1')
      
      expect(result).toEqual({
        userName: 'Alice',
        hash: 'a3f2d9e1'
      })
    })

    it('should return null for invalid format', () => {
      expect(parseUserIdentifier('invalid')).toBeNull()
      expect(parseUserIdentifier('no-hash-here')).toBeNull()
      expect(parseUserIdentifier('')).toBeNull()
      expect(parseUserIdentifier(null)).toBeNull()
      expect(parseUserIdentifier(undefined)).toBeNull()
    })

    it('should handle multiple # characters', () => {
      const result = parseUserIdentifier('User#Name#hash123')
      
      // Should only split on first #
      expect(result).toBeNull() // Our implementation expects exactly one #
    })

    it('should handle identifiers with special characters', () => {
      const result = parseUserIdentifier('User_123#abcd1234')
      
      expect(result).toEqual({
        userName: 'User_123',
        hash: 'abcd1234'
      })
    })
  })

  describe('isSameUser', () => {
    it('should return true for identical identifiers', () => {
      const id = 'Alice#a3f2d9e1'
      
      expect(isSameUser(id, id)).toBe(true)
    })

    it('should return false for different identifiers', () => {
      expect(isSameUser('Alice#a3f2d9e1', 'Bob#b4e3a0f2')).toBe(false)
    })

    it('should return false for null/undefined values', () => {
      expect(isSameUser(null, 'Alice#abc')).toBe(false)
      expect(isSameUser('Alice#abc', null)).toBe(false)
      expect(isSameUser(null, null)).toBe(false)
      expect(isSameUser(undefined, undefined)).toBe(false)
    })

    it('should be case-sensitive', () => {
      expect(isSameUser('Alice#abc', 'alice#abc')).toBe(false)
    })
  })

  describe('getDisplayName', () => {
    it('should extract userName from identifier', () => {
      expect(getDisplayName('Alice#a3f2d9e1')).toBe('Alice')
      expect(getDisplayName('Bob_123#xyz789')).toBe('Bob_123')
    })

    it('should return original string for invalid format', () => {
      expect(getDisplayName('invalid-format')).toBe('invalid-format')
      expect(getDisplayName('NoHash')).toBe('NoHash')
    })

    it('should handle null/undefined', () => {
      expect(getDisplayName(null)).toBeNull()
      expect(getDisplayName(undefined)).toBeUndefined()
    })

    it('should handle empty string', () => {
      expect(getDisplayName('')).toBe('')
    })
  })

  describe('Integration tests', () => {
    it('should work end-to-end', async () => {
      const userName = 'TestUser'
      const sharedCode = 'shared-secret-123'
      
      // Generate identifier
      const identifier = await generateUserIdentifier(userName, sharedCode)
      
      // Parse it
      const parsed = parseUserIdentifier(identifier)
      expect(parsed.userName).toBe(userName)
      
      // Extract display name
      const displayName = getDisplayName(identifier)
      expect(displayName).toBe(userName)
      
      // Check if same user
      const sameIdentifier = await generateUserIdentifier(userName, sharedCode)
      expect(isSameUser(identifier, sameIdentifier)).toBe(true)
    })

    it('should differentiate users with different codes', async () => {
      const user1 = await generateUserIdentifier('Alice', 'code1')
      const user2 = await generateUserIdentifier('Alice', 'code2')
      
      expect(isSameUser(user1, user2)).toBe(false)
      expect(getDisplayName(user1)).toBe('Alice')
      expect(getDisplayName(user2)).toBe('Alice')
    })
  })
})
