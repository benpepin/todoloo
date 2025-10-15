import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
        set((state) => ({
          customKeywords: [
            ...state.customKeywords,
            { id: crypto.randomUUID(), keyword: keyword.toLowerCase().trim(), minutes }
          ]
        })),

      removeCustomKeyword: (id: string) =>
        set((state) => ({
          customKeywords: state.customKeywords.filter(k => k.id !== id)
        })),

      updateCustomKeyword: (id: string, keyword: string, minutes: number) =>
        set((state) => ({
          customKeywords: state.customKeywords.map(k =>
            k.id === id ? { ...k, keyword: keyword.toLowerCase().trim(), minutes } : k
          )
        })),
    }),
    {
      name: 'todoloo-settings',
    }
  )
)
