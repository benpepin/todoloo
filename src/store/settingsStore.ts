import { create } from 'zustand'
import { getUserSettings, updateUserSettings } from '@/lib/db'

export interface CustomKeyword {
  id: string
  keyword: string
  minutes: number
}

interface SettingsState {
  showProgressIndicator: boolean
  defaultMinutes: number
  customKeywords: CustomKeyword[]
  isLoaded: boolean
  userId: string | null

  // Actions
  loadSettings: (userId: string) => Promise<void>
  toggleProgressIndicator: (userId: string) => Promise<void>
  setShowProgressIndicator: (show: boolean, userId: string) => Promise<void>
  setDefaultMinutes: (minutes: number, userId: string) => Promise<void>
  addCustomKeyword: (keyword: string, minutes: number, userId: string) => Promise<void>
  removeCustomKeyword: (id: string, userId: string) => Promise<void>
  updateCustomKeyword: (id: string, keyword: string, minutes: number, userId: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Default values
  showProgressIndicator: true,
  defaultMinutes: 30,
  customKeywords: [],
  isLoaded: false,
  userId: null,

  // Load settings from Supabase
  loadSettings: async (userId: string) => {
    try {
      const settings = await getUserSettings(userId)
      set({
        showProgressIndicator: settings.showProgressIndicator,
        defaultMinutes: settings.defaultMinutes,
        customKeywords: settings.customKeywords,
        isLoaded: true,
        userId
      })
      console.log('Settings loaded from Supabase:', settings)
    } catch (error) {
      console.error('Error loading settings:', error)
      // Keep default values on error
      set({ isLoaded: true, userId })
    }
  },

  // Toggle progress indicator
  toggleProgressIndicator: async (userId: string) => {
    const currentValue = get().showProgressIndicator
    const newValue = !currentValue

    // Optimistic update
    set({ showProgressIndicator: newValue })

    try {
      await updateUserSettings(userId, { showProgressIndicator: newValue })
      console.log('Progress indicator toggled to:', newValue)
    } catch (error) {
      console.error('Error updating progress indicator:', error)
      // Rollback on error
      set({ showProgressIndicator: currentValue })
    }
  },

  // Set progress indicator
  setShowProgressIndicator: async (show: boolean, userId: string) => {
    // Optimistic update
    set({ showProgressIndicator: show })

    try {
      await updateUserSettings(userId, { showProgressIndicator: show })
      console.log('Progress indicator set to:', show)
    } catch (error) {
      console.error('Error updating progress indicator:', error)
      // Rollback on error
      set({ showProgressIndicator: !show })
    }
  },

  // Set default minutes
  setDefaultMinutes: async (minutes: number, userId: string) => {
    const previousValue = get().defaultMinutes

    // Optimistic update
    set({ defaultMinutes: minutes })

    try {
      await updateUserSettings(userId, { defaultMinutes: minutes })
      console.log('Default minutes set to:', minutes)
    } catch (error) {
      console.error('Error updating default minutes:', error)
      // Rollback on error
      set({ defaultMinutes: previousValue })
    }
  },

  // Add custom keyword
  addCustomKeyword: async (keyword: string, minutes: number, userId: string) => {
    const newKeyword = {
      id: crypto.randomUUID(),
      keyword: keyword.toLowerCase().trim(),
      minutes
    }
    const previousKeywords = get().customKeywords
    const updatedKeywords = [...previousKeywords, newKeyword]

    // Optimistic update
    set({ customKeywords: updatedKeywords })
    console.log('Adding custom keyword:', newKeyword)

    try {
      await updateUserSettings(userId, { customKeywords: updatedKeywords })
      console.log('Custom keyword added successfully')
    } catch (error) {
      console.error('Error adding custom keyword:', error)
      // Rollback on error
      set({ customKeywords: previousKeywords })
    }
  },

  // Remove custom keyword
  removeCustomKeyword: async (id: string, userId: string) => {
    const previousKeywords = get().customKeywords
    const updatedKeywords = previousKeywords.filter(k => k.id !== id)

    // Optimistic update
    set({ customKeywords: updatedKeywords })
    console.log('Removing custom keyword with id:', id)

    try {
      await updateUserSettings(userId, { customKeywords: updatedKeywords })
      console.log('Custom keyword removed successfully')
    } catch (error) {
      console.error('Error removing custom keyword:', error)
      // Rollback on error
      set({ customKeywords: previousKeywords })
    }
  },

  // Update custom keyword
  updateCustomKeyword: async (id: string, keyword: string, minutes: number, userId: string) => {
    const previousKeywords = get().customKeywords
    const updatedKeywords = previousKeywords.map(k =>
      k.id === id ? { ...k, keyword: keyword.toLowerCase().trim(), minutes } : k
    )

    // Optimistic update
    set({ customKeywords: updatedKeywords })
    console.log('Updating custom keyword with id:', id, 'to:', { keyword, minutes })

    try {
      await updateUserSettings(userId, { customKeywords: updatedKeywords })
      console.log('Custom keyword updated successfully')
    } catch (error) {
      console.error('Error updating custom keyword:', error)
      // Rollback on error
      set({ customKeywords: previousKeywords })
    }
  }
}))
