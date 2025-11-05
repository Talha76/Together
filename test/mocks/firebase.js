// test/mocks/firebase.js
import { vi } from 'vitest'

export const mockFirestore = {
  collection: vi.fn(() => mockFirestore),
  doc: vi.fn(() => mockFirestore),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({ participants: {} })
  })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
  onSnapshot: vi.fn((callback) => {
    callback({
      exists: () => true,
      data: () => ({ participants: {} }),
      forEach: (fn) => {}
    })
    return vi.fn() // unsubscribe function
  }),
  query: vi.fn(() => mockFirestore),
  orderBy: vi.fn(() => mockFirestore),
  limit: vi.fn(() => mockFirestore),
  where: vi.fn(() => mockFirestore)
}

export const db = mockFirestore

export const initializeApp = vi.fn()

export const getFirestore = vi.fn(() => mockFirestore)

export const serverTimestamp = vi.fn(() => Date.now())

// Export Firestore functions
export {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  limit,
  where
} from 'firebase/firestore'

// Mock implementations
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn()
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
  collection: vi.fn(() => mockFirestore),
  doc: vi.fn(() => mockFirestore),
  setDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({})
  })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-id' })),
  onSnapshot: vi.fn((query, callback) => {
    callback({
      exists: () => true,
      data: () => ({}),
      forEach: (fn) => {}
    })
    return vi.fn()
  }),
  query: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => Date.now())
}))
