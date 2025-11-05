// src/chatRoomManager.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatRoomManager } from './chatRoomManager'

// Mock Firebase
vi.mock('./firebase', () => ({
  db: {}
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, collection, id) => ({ collection, id })),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ participants: {} })
  })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  onSnapshot: vi.fn((docRef, callback) => {
    callback({
      exists: () => true,
      data: () => ({ participants: {} })
    })
    return vi.fn() // unsubscribe function
  }),
  serverTimestamp: vi.fn(() => Date.now())
}))

describe('ChatRoomManager', () => {
  let manager
  let mockGetDoc
  let mockSetDoc
  let mockUpdateDoc
  let mockDeleteDoc
  let mockOnSnapshot

  beforeEach(async () => {
    vi.useFakeTimers()
    manager = new ChatRoomManager()
    
    // Get mocked functions
    const firestore = await import('firebase/firestore')
    mockGetDoc = firestore.getDoc
    mockSetDoc = firestore.setDoc
    mockUpdateDoc = firestore.updateDoc
    mockDeleteDoc = firestore.deleteDoc
    mockOnSnapshot = firestore.onSnapshot
    
    // Reset all mocks if they have mockClear
    if (mockGetDoc && typeof mockGetDoc.mockClear === 'function') mockGetDoc.mockClear()
    if (mockSetDoc && typeof mockSetDoc.mockClear === 'function') mockSetDoc.mockClear()
    if (mockUpdateDoc && typeof mockUpdateDoc.mockClear === 'function') mockUpdateDoc.mockClear()
    if (mockDeleteDoc && typeof mockDeleteDoc.mockClear === 'function') mockDeleteDoc.mockClear()
    if (mockOnSnapshot && typeof mockOnSnapshot.mockClear === 'function') mockOnSnapshot.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    manager.cleanup('test-room', 'test-device')
  })

  describe('joinRoom', () => {
    it('should join a new room successfully', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      })

      const result = await manager.joinRoom('room-1', 'device-1', 'Alice')

      expect(result.success).toBe(true)
      expect(mockSetDoc).toHaveBeenCalled()
    })

    it('should join an existing room', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          participants: {
            'other-device': {
              userName: 'Bob',
              joinedAt: Date.now(),
              lastSeen: Date.now()
            }
          }
        })
      })

      const result = await manager.joinRoom('room-1', 'device-1', 'Alice')

      expect(result.success).toBe(true)
      expect(mockSetDoc).toHaveBeenCalled()
    })

    it('should reject joining full room', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          participants: {
            'device-1': {
              userName: 'User1',
              joinedAt: Date.now(),
              lastSeen: Date.now()
            },
            'device-2': {
              userName: 'User2',
              joinedAt: Date.now(),
              lastSeen: Date.now()
            }
          }
        })
      })

      const result = await manager.joinRoom('room-1', 'device-3', 'Alice')

      expect(result.success).toBe(false)
      expect(result.error).toContain('full')
    })

    it('should allow rejoining with same device', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          participants: {
            'device-1': {
              userName: 'Alice',
              joinedAt: Date.now() - 1000,
              lastSeen: Date.now() - 1000
            }
          }
        })
      })

      const result = await manager.joinRoom('room-1', 'device-1', 'Alice')

      expect(result.success).toBe(true)
      expect(result.isRejoining).toBe(true)
    })

    it('should remove inactive participants', async () => {
      const now = Date.now()
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          participants: {
            'device-old': {
              userName: 'OldUser',
              joinedAt: now - 100000,
              lastSeen: now - 100000 // Very old
            }
          }
        })
      })

      const result = await manager.joinRoom('room-1', 'device-1', 'Alice')

      expect(result.success).toBe(true)
      // Should have cleaned up old participant
    })

    it('should handle errors gracefully', async () => {
      mockGetDoc.mockRejectedValue(new Error('Network error'))

      const result = await manager.joinRoom('room-1', 'device-1', 'Alice')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to join')
    })

    it('should start heartbeat after joining', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      })

      await manager.joinRoom('room-1', 'device-1', 'Alice')

      expect(manager.heartbeatInterval).toBeTruthy()
    })
  })

  describe('updatePresence', () => {
    it('should update user presence', async () => {
      await manager.updatePresence('room-1', 'device-1', 'Alice')

      expect(mockUpdateDoc).toHaveBeenCalled()
      const updateCall = mockUpdateDoc.mock.calls[0]
      expect(updateCall[1]).toHaveProperty('participants.device-1.lastSeen')
    })

    it('should handle update errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'))

      // Should not throw
      await expect(
        manager.updatePresence('room-1', 'device-1', 'Alice')
      ).resolves.not.toThrow()
    })
  })

  describe('startHeartbeat', () => {
    it('should send periodic heartbeats', async () => {
      manager.startHeartbeat('room-1', 'device-1', 'Alice')

      expect(mockUpdateDoc).toHaveBeenCalled() // Initial update

      mockUpdateDoc.mockClear()

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000)

      expect(mockUpdateDoc).toHaveBeenCalled() // Heartbeat update
    })

    it('should clear existing heartbeat', () => {
      manager.startHeartbeat('room-1', 'device-1', 'Alice')
      const firstInterval = manager.heartbeatInterval

      manager.startHeartbeat('room-1', 'device-1', 'Alice')
      const secondInterval = manager.heartbeatInterval

      expect(firstInterval).not.toBe(secondInterval)
    })
  })

  describe('stopHeartbeat', () => {
    it('should stop heartbeat interval', () => {
      manager.startHeartbeat('room-1', 'device-1', 'Alice')
      expect(manager.heartbeatInterval).toBeTruthy()

      manager.stopHeartbeat()
      expect(manager.heartbeatInterval).toBeNull()
    })

    it('should handle stopping when not running', () => {
      expect(() => manager.stopHeartbeat()).not.toThrow()
    })
  })

  describe('leaveRoom', () => {
    beforeEach(async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      })
      await manager.joinRoom('room-1', 'device-1', 'Alice')
    })

    it('should remove user from room', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          participants: {
            'device-1': {
              userName: 'Alice',
              joinedAt: Date.now(),
              lastSeen: Date.now()
            },
            'device-2': {
              userName: 'Bob',
              joinedAt: Date.now(),
              lastSeen: Date.now()
            }
          }
        })
      })

      await manager.leaveRoom('room-1', 'device-1')

      expect(mockSetDoc).toHaveBeenCalled()
      expect(manager.heartbeatInterval).toBeNull()
    })

    it('should delete empty room', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          participants: {
            'device-1': {
              userName: 'Alice',
              joinedAt: Date.now(),
              lastSeen: Date.now()
            }
          }
        })
      })

      await manager.leaveRoom('room-1', 'device-1')

      expect(mockDeleteDoc).toHaveBeenCalled()
    })

    it('should handle errors when leaving', async () => {
      mockGetDoc.mockRejectedValue(new Error('Network error'))

      await expect(
        manager.leaveRoom('room-1', 'device-1')
      ).resolves.not.toThrow()
    })
  })

  describe('listenToParticipants', () => {
    it('should listen to participant changes', () => {
      const callback = vi.fn()

      manager.listenToParticipants('room-1', callback)

      expect(mockOnSnapshot).toHaveBeenCalled()
      expect(callback).toHaveBeenCalled()
    })

    it('should filter inactive participants', () => {
      const now = Date.now()
      const callback = vi.fn()

      mockOnSnapshot.mockImplementation((docRef, cb) => {
        cb({
          exists: () => true,
          data: () => ({
            participants: {
              'active': {
                userName: 'Active',
                lastSeen: now
              },
              'inactive': {
                userName: 'Inactive',
                lastSeen: now - 100000
              }
            }
          })
        })
        return vi.fn()
      })

      manager.listenToParticipants('room-1', callback)

      const participants = callback.mock.calls[0][0]
      expect(participants).toHaveProperty('active')
      expect(participants).not.toHaveProperty('inactive')
    })

    it('should return unsubscribe function', () => {
      const unsubscribe = manager.listenToParticipants('room-1', vi.fn())

      expect(typeof unsubscribe).toBe('function')
      expect(() => unsubscribe()).not.toThrow()
    })
  })

  describe('stopListening', () => {
    it('should stop participant listener', () => {
      const unsubscribe = vi.fn()
      mockOnSnapshot.mockReturnValue(unsubscribe)

      manager.listenToParticipants('room-1', vi.fn())
      manager.stopListening()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('should handle stopping when not listening', () => {
      expect(() => manager.stopListening()).not.toThrow()
    })
  })

  describe('cleanup', () => {
    beforeEach(async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      })
      await manager.joinRoom('room-1', 'device-1', 'Alice')
      manager.listenToParticipants('room-1', vi.fn())
    })

    it('should stop all activities', () => {
      manager.cleanup('room-1', 'device-1')

      expect(manager.heartbeatInterval).toBeNull()
      expect(manager.participantUnsubscribe).toBeNull()
    })

    it('should handle cleanup without active room', () => {
      manager.stopHeartbeat()
      manager.stopListening()

      expect(() => manager.cleanup()).not.toThrow()
    })
  })

  describe('Integration scenarios', () => {
    it('should handle full user flow', async () => {
      // Join room
      const joinResult = await manager.joinRoom('room-1', 'device-1', 'Alice')
      expect(joinResult.success).toBe(true)

      // Listen to participants
      const callback = vi.fn()
      manager.listenToParticipants('room-1', callback)

      // Heartbeat should be running
      expect(manager.heartbeatInterval).toBeTruthy()

      // Leave room
      await manager.leaveRoom('room-1', 'device-1')

      // Cleanup should be done
      expect(manager.heartbeatInterval).toBeNull()
    })

    it('should handle rapid join/leave', async () => {
      await manager.joinRoom('room-1', 'device-1', 'Alice')
      await manager.leaveRoom('room-1', 'device-1')
      await manager.joinRoom('room-1', 'device-1', 'Alice')
      
      expect(manager.heartbeatInterval).toBeTruthy()
    })

    it('should handle multiple room instances', async () => {
      const manager1 = new ChatRoomManager()
      const manager2 = new ChatRoomManager()

      mockGetDoc.mockResolvedValue({
        exists: () => false
      })

      const result1 = await manager1.joinRoom('room-1', 'device-1', 'Alice')
      const result2 = await manager2.joinRoom('room-1', 'device-2', 'Bob')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)

      manager1.cleanup('room-1', 'device-1')
      manager2.cleanup('room-1', 'device-2')
    })
  })
})
