import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TaskHistoryEntry, SimilarTaskStats } from '@/types'
import { indexedDbStorage } from '@/storage/indexedDbStorage'
import { getSimilarTaskStats } from '@/utils/similarity'

interface HistoryStore {
  entries: TaskHistoryEntry[]
  addEntry: (entry: Omit<TaskHistoryEntry, 'id'>) => void
  updateEntry: (id: string, updates: Partial<Omit<TaskHistoryEntry, 'id'>>) => void
  deleteEntry: (id: string) => void
  clearHistory: () => void
  getSimilarStats: (description: string, threshold?: number) => SimilarTaskStats
  migrateCompletedTasks: (completedTasks: Array<{ description: string; estimatedMinutes: number; actualMinutes?: number; completedAt: Date }>) => void
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

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  ...updates,
                  // Update normalized description if original description changes
                  normalizedDescription: updates.originalDescription
                    ? updates.originalDescription.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
                    : entry.normalizedDescription,
                }
              : entry
          ),
        }))
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        }))
      },

      clearHistory: () => {
        set({ entries: [] })
      },

      getSimilarStats: (description, threshold = 0.4) => {
        const { entries } = get()
        return getSimilarTaskStats(description, entries, threshold)
      },

      migrateCompletedTasks: (completedTasks) => {
        const { entries } = get()
        
        const newEntries = completedTasks
          .filter(task => {
            // Only add if not already in history (check by description and completion time)
            return !entries.some(entry => 
              entry.originalDescription === task.description && 
              Math.abs(new Date(entry.completedAt).getTime() - new Date(task.completedAt).getTime()) < 1000
            )
          })
          .map(task => ({
            id: crypto.randomUUID(),
            normalizedDescription: task.description.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim(),
            originalDescription: task.description,
            estimatedMinutes: task.estimatedMinutes,
            actualMinutes: task.actualMinutes || task.estimatedMinutes,
            completedAt: task.completedAt,
          }))
        
        if (newEntries.length > 0) {
          set((state) => ({
            entries: [...newEntries, ...state.entries]
          }))
        }
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

