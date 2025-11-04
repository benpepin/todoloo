import { get, set, del } from 'idb-keyval'
import type { PersistStorage } from 'zustand/middleware'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Create a storage adapter that works with Zustand's persist middleware
// Zustand expects synchronous-like interface but supports promises
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const indexedDbStorage: PersistStorage<any> = {
  getItem: (name: string) => {
    if (!isBrowser) return null

    return (async () => {
      try {
        // Try IndexedDB first
        const value = await get(name)
        if (value !== undefined) {
          return value
        }

        // Fallback to localStorage if IndexedDB returns undefined
        const localValue = localStorage.getItem(name)
        return localValue ? JSON.parse(localValue) : null
      } catch (error) {
        console.error('IndexedDB getItem error, falling back to localStorage:', error)
        try {
          const localValue = localStorage.getItem(name)
          return localValue ? JSON.parse(localValue) : null
        } catch (localError) {
          console.error('localStorage getItem error:', localError)
          return null
        }
      }
    })()
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setItem: (name: string, value: any) => {
    if (!isBrowser) return

    return (async () => {
      try {
        // Store directly in IndexedDB (no need to stringify)
        await set(name, value)

        // Also save to localStorage as backup (need to stringify)
        localStorage.setItem(name, JSON.stringify(value))
      } catch (error) {
        console.error('IndexedDB setItem error, falling back to localStorage:', error)
        try {
          localStorage.setItem(name, JSON.stringify(value))
        } catch (localError) {
          console.error('localStorage setItem error:', localError)
        }
      }
    })()
  },

  removeItem: (name: string) => {
    if (!isBrowser) return

    return (async () => {
      try {
        await del(name)
        localStorage.removeItem(name)
      } catch (error) {
        console.error('IndexedDB removeItem error:', error)
        try {
          localStorage.removeItem(name)
        } catch (localError) {
          console.error('localStorage removeItem error:', localError)
        }
      }
    })()
  }
}
