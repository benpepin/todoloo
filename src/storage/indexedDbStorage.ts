import { get, set, del, clear, keys } from 'idb-keyval'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined'

export const indexedDbStorage = {
  getItem: async (name: string) => {
    if (!isBrowser) return null
    try {
      const value = await get(name)
      return value || null
    } catch (error) {
      console.error('IndexedDB getItem error:', error)
      return null
    }
  },
  setItem: async (name: string, value: any): Promise<void> => {
    if (!isBrowser) return
    try {
      await set(name, value)
    } catch (error) {
      console.error('IndexedDB setItem error:', error)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isBrowser) return
    try {
      await del(name)
    } catch (error) {
      console.error('IndexedDB removeItem error:', error)
    }
  },
  clear: async (): Promise<void> => {
    if (!isBrowser) return
    try {
      await clear()
    } catch (error) {
      console.error('IndexedDB clear error:', error)
    }
  },
  getAllKeys: async (): Promise<string[]> => {
    if (!isBrowser) return []
    try {
      return await keys()
    } catch (error) {
      console.error('IndexedDB getAllKeys error:', error)
      return []
    }
  }
}
