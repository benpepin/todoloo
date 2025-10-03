import { get, set, del, clear, keys } from 'idb-keyval'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Fallback to localStorage if IndexedDB is not available
const getStorageMethod = () => {
  if (!isBrowser) return 'none'
  if (typeof indexedDB !== 'undefined') return 'indexeddb'
  return 'localstorage'
}

const storageMethod = getStorageMethod()

// localStorage fallback implementation
const localStorageStorage = {
  getItem: async (name: string) => {
    if (!isBrowser) return null
    try {
      const value = localStorage.getItem(name)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('localStorage getItem error:', error)
      return null
    }
  },
  setItem: async (name: string, value: unknown): Promise<void> => {
    if (!isBrowser) return
    try {
      localStorage.setItem(name, JSON.stringify(value))
    } catch (error) {
      console.error('localStorage setItem error:', error)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isBrowser) return
    try {
      localStorage.removeItem(name)
    } catch (error) {
      console.error('localStorage removeItem error:', error)
    }
  },
  clear: async (): Promise<void> => {
    if (!isBrowser) return
    try {
      localStorage.clear()
    } catch (error) {
      console.error('localStorage clear error:', error)
    }
  },
  getAllKeys: async (): Promise<string[]> => {
    if (!isBrowser) return []
    try {
      return Object.keys(localStorage)
    } catch (error) {
      console.error('localStorage getAllKeys error:', error)
      return []
    }
  }
}

// IndexedDB implementation
const indexedDbStorageImpl = {
  getItem: async (name: string) => {
    if (!isBrowser) return null
    try {
      const value = await get(name)
      return value || null
    } catch (error) {
      console.error('IndexedDB getItem error:', error)
      // Fallback to localStorage on IndexedDB error
      return await localStorageStorage.getItem(name)
    }
  },
  setItem: async (name: string, value: unknown): Promise<void> => {
    if (!isBrowser) return
    try {
      await set(name, value)
    } catch (error) {
      console.error('IndexedDB setItem error:', error)
      // Fallback to localStorage on IndexedDB error
      await localStorageStorage.setItem(name, value)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isBrowser) return
    try {
      await del(name)
    } catch (error) {
      console.error('IndexedDB removeItem error:', error)
      // Fallback to localStorage on IndexedDB error
      await localStorageStorage.removeItem(name)
    }
  },
  clear: async (): Promise<void> => {
    if (!isBrowser) return
    try {
      await clear()
    } catch (error) {
      console.error('IndexedDB clear error:', error)
      // Fallback to localStorage on IndexedDB error
      await localStorageStorage.clear()
    }
  },
  getAllKeys: async (): Promise<string[]> => {
    if (!isBrowser) return []
    try {
      return await keys()
    } catch (error) {
      console.error('IndexedDB getAllKeys error:', error)
      // Fallback to localStorage on IndexedDB error
      return await localStorageStorage.getAllKeys()
    }
  }
}

// Export the appropriate storage implementation
export const indexedDbStorage = storageMethod === 'indexeddb' ? indexedDbStorageImpl : localStorageStorage
