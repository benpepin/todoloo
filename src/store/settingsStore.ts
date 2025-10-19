import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { indexedDbStorage } from '@/storage/indexedDbStorage'

export interface CustomKeyword {
  id: string
  keyword: string
  minutes: number
}

interface SettingsState {
  showProgressIndicator: boolean
  toggleProgressIndicator: () => void
  setShowProgressIndicator: (show: boolean) => void

  // Time estimation settings
  defaultMinutes: number
  customKeywords: CustomKeyword[]
  setDefaultMinutes: (minutes: number) => void
  addCustomKeyword: (keyword: string, minutes: number) => void
  removeCustomKeyword: (id: string) => void
  updateCustomKeyword: (id: string, keyword: string, minutes: number) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      showProgressIndicator: true,
      toggleProgressIndicator: () =>
        set((state) => ({ showProgressIndicator: !state.showProgressIndicator })),
      setShowProgressIndicator: (show: boolean) =>
        set({ showProgressIndicator: show }),

      // Time estimation defaults
      defaultMinutes: 30,
      customKeywords: [],

      setDefaultMinutes: (minutes: number) =>
        set({ defaultMinutes: minutes }),

      addCustomKeyword: (keyword: string, minutes: number) =>
        set((state) => {
          const newKeyword = { id: crypto.randomUUID(), keyword: keyword.toLowerCase().trim(), minutes }
          const updatedKeywords = [...state.customKeywords, newKeyword]
          console.log('Adding custom keyword:', newKeyword)
          console.log('Updated custom keywords:', updatedKeywords)
          return { customKeywords: updatedKeywords }
        }),

      removeCustomKeyword: (id: string) =>
        set((state) => {
          const updatedKeywords = state.customKeywords.filter(k => k.id !== id)
          console.log('Removing custom keyword with id:', id)
          console.log('Updated custom keywords:', updatedKeywords)
          return { customKeywords: updatedKeywords }
        }),

      updateCustomKeyword: (id: string, keyword: string, minutes: number) =>
        set((state) => {
          const updatedKeywords = state.customKeywords.map(k =>
            k.id === id ? { ...k, keyword: keyword.toLowerCase().trim(), minutes } : k
          )
          console.log('Updating custom keyword with id:', id, 'to:', { keyword, minutes })
          console.log('Updated custom keywords:', updatedKeywords)
          return { customKeywords: updatedKeywords }
        }),
    }),
    {
      name: 'todoloo-settings',
      storage: indexedDbStorage,
    }
  )
)
