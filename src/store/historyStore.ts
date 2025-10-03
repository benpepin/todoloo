import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TaskHistoryEntry, SimilarTaskStats } from '@/types'
import { indexedDbStorage } from '@/storage/indexedDbStorage'
import { getSimilarTaskStats } from '@/utils/similarity'

interface HistoryStore {
  entries: TaskHistoryEntry[]
  addEntry: (entry: Omit<TaskHistoryEntry, 'id'>) => void
  clearHistory: () => void
  getSimilarStats: (description: string, threshold?: number) => SimilarTaskStats
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entryData) => {
        const entry: TaskHistoryEntry = {
          ...entryData,
          id: crypto.randomUUID(),
        }
        set((state) => ({
          entries: [entry, ...state.entries],
        }))
      },

      clearHistory: () => {
        set({ entries: [] })
      },

      getSimilarStats: (description, threshold = 0.4) => {
        const { entries } = get()
        return getSimilarTaskStats(description, entries, threshold)
      },
    }),
    {
      name: 'todoloo-history-storage',
      storage: indexedDbStorage,
      partialize: (state) => ({
        entries: state.entries,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('History store rehydrated successfully')
        }
      },
    }
  )
)

