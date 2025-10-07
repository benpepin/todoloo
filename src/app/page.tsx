'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ToDoList from '@/components/ToDoList'
import SettingsBackup from '@/components/SettingsBackup'
import HorseRaceProgress from '@/components/HorseRaceProgress'
import { useToDoStore } from '@/store/toDoStore'
import { useSettingsStore } from '@/store/settingsStore'
import { getCurrentDate, getCompletionTime } from '@/utils/timeUtils'
import { migrateLocalStorageToSupabase } from '@/lib/migrate-to-supabase'
import { useSupabase } from '@/components/SupabaseProvider'
import Auth from '@/components/Auth'

export default function Home() {
  const { user, loading: authLoading } = useSupabase()
  const toggleCreateTask = useToDoStore((state) => state.toggleCreateTask)
  const tasks = useToDoStore((state) => state.tasks)
  const addTask = useToDoStore((state) => state.addTask)
  const initializeUser = useToDoStore((state) => state.initializeUser)
  const isLoading = useToDoStore((state) => state.isLoading)
  const error = useToDoStore((state) => state.error)
  const clearError = useToDoStore((state) => state.clearError)
  const isInitialized = useToDoStore((state) => state.isInitialized)
  const showProgressIndicator = useSettingsStore((state) => state.showProgressIndicator)

  const [showCompletionTime, setShowCompletionTime] = useState(false)
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null)
  
  // Calculate total time for incomplete to dos
  const totalMinutes = tasks
    .filter(task => !task.isCompleted)
    .reduce((total, task) => total + task.estimatedMinutes, 0)
  
  const completionTime = totalMinutes > 0 ? getCompletionTime(totalMinutes) : null

  // Get active task from store
  const activeTaskId = useToDoStore((state) => state.activeTaskId)
  const activeTask = tasks.find(task => task.id === activeTaskId)

  // Initialize app when user changes
  useEffect(() => {
    const initializeApp = async () => {
      if (authLoading) return // Wait for auth to load
      
      if (!user) {
        // No user - clear any existing data and reset store
        setMigrationStatus(null)
        useToDoStore.getState().clearAllTasks()
        return
      }

      try {
        // Run migration first (only if not already initialized)
        if (!isInitialized) {
          const migrationResult = await migrateLocalStorageToSupabase()
          setMigrationStatus(migrationResult.message)
          
          if (migrationResult.success) {
            console.log('Migration:', migrationResult.message)
          } else {
            console.error('Migration failed:', migrationResult.message)
          }
        }
        
        // Initialize user and load tasks
        await initializeUser(user.id)
      } catch (error) {
        console.error('Error initializing app:', error)
        setMigrationStatus('Failed to initialize app')
      }
    }

    initializeApp()
  }, [user, authLoading, isInitialized, initializeUser])

  // Update document title with active task
  useEffect(() => {
    if (activeTask) {
      document.title = activeTask.description
    } else {
      document.title = 'TODOLOOS'
    }
  }, [activeTask])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if no input/textarea is focused
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      )

      if (!isInputFocused) {
        // Handle 'n' key for new to do
        if (event.key.toLowerCase() === 'n') {
          event.preventDefault()
          toggleCreateTask()
        }
        
        // Handle number keys (1-9) to create that many to dos
        const num = parseInt(event.key)
        if (num >= 1 && num <= 9) {
          event.preventDefault()
          for (let i = 0; i < num; i++) {
            addTask(`To Do ${i + 1}`, 15) // Default 15 minutes
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCreateTask, addTask])

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-todoloo-bg)' }}>
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading...</div>
          <div className="text-sm text-gray-600">Setting up your todo app</div>
        </div>
      </div>
    )
  }

  // Show auth component if not signed in
  if (!user) {
    return (
      <div className="w-full h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-todoloo-bg)' }}>
        <Auth />
      </div>
    )
  }

  // Sign out moved to Settings page

  return (
    <div className="w-full h-screen flex" style={{ backgroundColor: 'var(--color-todoloo-bg)' }}>
      {/* Sidebar - 20% width */}
      <div className="w-[20%] h-full p-8 overflow-hidden border-r flex flex-col justify-between items-start" 
           style={{ 
             backgroundColor: 'var(--color-todoloo-sidebar)',
             borderColor: 'var(--color-todoloo-border)'
           }}>
        <div className="w-full flex flex-col justify-start items-start gap-1.5">
          <div
            className="w-full text-base font-['Geist'] font-normal cursor-pointer transition-colors duration-200 hover:opacity-70"
            style={{ color: 'var(--color-todoloo-text-secondary)' }}
            onClick={() => setShowCompletionTime(!showCompletionTime)}
          >
            {showCompletionTime ? (
              getCurrentDate()
            ) : (
              totalMinutes === 0 ? (
                "You're done! Put the computer down"
              ) : (
                `Free at ${completionTime}`
              )
            )}
          </div>
        </div>
        <div className="w-full flex justify-start items-start gap-4">
          <Link href="/settings" 
                className="text-xs font-['Geist'] font-normal transition-colors cursor-pointer"
                style={{ 
                  color: 'var(--color-todoloo-text-secondary)'
                } as React.CSSProperties}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-todoloo-text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-todoloo-text-secondary)'}>
            Settings
          </Link>
          <div className="text-xs font-['Geist'] font-normal" 
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>•</div>
          <div className="text-xs font-['Geist'] font-normal" 
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>Terms</div>
          <div className="text-xs font-['Geist'] font-normal" 
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>•</div>
          <div className="text-xs font-['Geist'] font-normal" 
               style={{ color: 'var(--color-todoloo-text-secondary)' }}>Give Feedback</div>
        </div>
      </div>
      
      {/* Main Content - 80% width */}
      <div className="w-[80%] h-full p-8 overflow-y-auto flex flex-col justify-start items-center gap-2.5"
           style={{ backgroundColor: 'var(--color-todoloo-main)' }}>
        
        {/* Error Display */}
        {error && (
          <div className="w-full max-w-[460px] mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="w-full max-w-[460px] mb-4 p-4 bg-blue-100 border border-blue-300 rounded-lg">
            <p className="text-blue-800 text-sm">Loading tasks...</p>
          </div>
        )}

        {/* Migration Status - Only show if there's an actual migration happening */}
        {migrationStatus && migrationStatus !== 'Already migrated' && (
          <div className="w-full max-w-[460px] mb-4 p-4 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-green-800 text-sm">{migrationStatus}</p>
          </div>
        )}

        <div className="w-full flex justify-center items-center gap-0.75">
          <div className="w-full max-w-[460px] flex flex-col justify-start items-start gap-8">
            {/* Horse Race Progress Indicator */}
            {showProgressIndicator && <HorseRaceProgress />}

            <ToDoList />
          </div>
        </div>
      </div>
      
      <SettingsBackup />
    </div>
  )
}
