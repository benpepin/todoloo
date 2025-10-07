import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  showProgressIndicator: boolean
  toggleProgressIndicator: () => void
  setShowProgressIndicator: (show: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      showProgressIndicator: true,
      toggleProgressIndicator: () =>
        set((state) => ({ showProgressIndicator: !state.showProgressIndicator })),
      setShowProgressIndicator: (show: boolean) =>
        set({ showProgressIndicator: show }),
    }),
    {
      name: 'todoloo-settings',
    }
  )
)
