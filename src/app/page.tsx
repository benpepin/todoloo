'use client'

import { useEffect, useState } from 'react'
import ToDoList from '@/components/ToDoList'
import HorseRaceProgress from '@/components/HorseRaceProgress'
import ShoppingCartProgress from '@/components/ShoppingCartProgress'
import SettingsMenu from '@/components/SettingsMenu'
import { useToDoStore } from '@/store/toDoStore'
import { useSettingsStore } from '@/store/settingsStore'
import { getCurrentDate, getCompletionTime } from '@/utils/timeUtils'
import { migrateLocalStorageToSupabase } from '@/lib/migrate-to-supabase'
import { useSupabase } from '@/components/SupabaseProvider'
import Auth from '@/components/Auth'
import ListSwitcher from '@/components/ListSwitcher'
import { PersonalLists } from '@/components/PersonalLists'

export default function Home() {
  const { user, loading: authLoading } = useSupabase()
  const toggleCreateTask = useToDoStore((state) => state.toggleCreateTask)
  const tasks = useToDoStore((state) => state.tasks)
  const addTask = useToDoStore((state) => state.addTask)
  const isLoading = useToDoStore((state) => state.isLoading)
  const error = useToDoStore((state) => state.error)
  const clearError = useToDoStore((state) => state.clearError)
  const isInitialized = useToDoStore((state) => state.isInitialized)
  const lists = useToDoStore((state) => state.lists)
  const currentListId = useToDoStore((state) => state.currentListId)
  const showProgressIndicator = useSettingsStore((state) => state.showProgressIndicator)
  const showShoppingCartProgress = useSettingsStore((state) => state.showShoppingCartProgress)
  const getInspirationalQuote = useToDoStore((state) => state.getInspirationalQuote)
  const cycleQuote = useToDoStore((state) => state.cycleQuote)
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

  // Determine if current list is a shopping list
  const currentList = lists.find(list => list.id === currentListId)
  const isShoppingList = currentList ?
    /shopping|groceries|grocery/i.test(currentList.name) : false

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
        await useToDoStore.getState().initializeUser(user.id)
      } catch (error) {
        console.error('Error initializing app:', error)
        setMigrationStatus('Failed to initialize app')
      }
    }

    initializeApp()
  }, [user, authLoading, isInitialized])

  // Update document title with active task
  useEffect(() => {
    if (activeTask) {
      document.title = activeTask.description
    } else {
      document.title = 'TODOLOOS'
    }
  }, [activeTask])

  // Auto-archive completed tasks at midnight
  useEffect(() => {
    const deleteTask = useToDoStore.getState().deleteTask

    const checkAndArchive = () => {
      const now = new Date()
      const completedTasks = tasks.filter(task => task.isCompleted && task.completedAt)

      completedTasks.forEach(task => {
        if (task.completedAt) {
          const completedDate = new Date(task.completedAt)
          // If completed date is not today, delete it
          if (completedDate.toDateString() !== now.toDateString()) {
            deleteTask(task.id)
          }
        }
      })
    }

    // Check immediately on mount
    checkAndArchive()

    // Calculate milliseconds until next midnight
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const msUntilMidnight = tomorrow.getTime() - now.getTime()

    // Set timeout for midnight, then interval for every 24 hours
    const midnightTimeout = setTimeout(() => {
      checkAndArchive()

      // After first midnight check, set up daily interval
      const dailyInterval = setInterval(checkAndArchive, 24 * 60 * 60 * 1000)

      return () => clearInterval(dailyInterval)
    }, msUntilMidnight)

    return () => clearTimeout(midnightTimeout)
  }, [tasks])

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
        // Only if no modifier keys are pressed (to avoid interfering with browser shortcuts like Cmd+1 for tab switching)
        const num = parseInt(event.key)
        if (num >= 1 && num <= 9 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
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
    return <Auth />
  }

  // Sign out moved to Settings page

  return (
    <div className="w-full h-screen flex flex-col lg:flex-row" style={{ backgroundColor: 'var(--color-todoloo-bg)' }}>
      {/* Mobile Header - visible only on mobile/tablet */}
      <div className="lg:hidden w-full p-4 border-b flex justify-between items-center"
           style={{
             backgroundColor: 'var(--color-todoloo-sidebar)',
             borderColor: 'var(--color-todoloo-border)'
           }}>
        <div className="flex flex-col gap-1">
          <ListSwitcher />
          <div
            className="text-sm font-['Geist'] font-normal"
            style={{ color: 'var(--color-todoloo-text-secondary)' }}
          >
            {totalMinutes === 0 ? (
              "You're done!"
            ) : (
              `Done at ${completionTime}`
            )}
          </div>
        </div>
        <SettingsMenu />
      </div>

      {/* Desktop Sidebar - hidden on mobile/tablet */}
      <div className="hidden lg:flex lg:w-[20%] h-full p-8 border-r flex-col items-start"
           style={{
             backgroundColor: 'var(--color-todoloo-sidebar)',
             borderColor: 'var(--color-todoloo-border)',
             minWidth: '340px'
           }}>
        {/* Top Section: Dropdown */}
        <div className="w-full mb-6">
          <ListSwitcher />
        </div>

        {/* Middle Section: Personal Lists (Centered Vertically) */}
        <div className="flex-1 w-full flex items-center justify-center overflow-y-auto">
          <div className="w-full">
            <PersonalLists />
          </div>
        </div>

        {/* Bottom Section: Quote/Completion Time & Settings */}
        <div className="w-full flex flex-col gap-4">
          <div
            className="w-full text-base font-['Geist'] font-normal cursor-pointer transition-colors duration-200 hover:opacity-70"
            style={{ color: 'var(--color-todoloo-text-secondary)' }}
            onClick={() => {
              if (totalMinutes === 0) {
                cycleQuote()
              } else {
                setShowCompletionTime(!showCompletionTime)
              }
            }}
          >
            {showCompletionTime ? (
              getCurrentDate()
            ) : (
              totalMinutes === 0 ? (
                getInspirationalQuote()
              ) : (
                `You're done at ${completionTime}`
              )
            )}
          </div>
          <SettingsMenu />
        </div>
      </div>

      {/* Main Content - full width on mobile, 80% on desktop */}
      <div className="w-full lg:w-[80%] h-full p-4 md:p-6 lg:p-8 overflow-y-auto flex flex-col justify-start items-center gap-2.5"
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
            {/* Progress Indicator - Shopping Cart for shopping lists, Horse for others */}
            {showProgressIndicator && isShoppingList && showShoppingCartProgress && <ShoppingCartProgress />}
            {showProgressIndicator && !isShoppingList && <HorseRaceProgress />}

            <ToDoList />
          </div>
        </div>
      </div>

      {/* Floating Action Button - Mobile Only */}
      <button
        onClick={toggleCreateTask}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 active:scale-95 transition-transform"
        style={{
          background: 'linear-gradient(to right, var(--color-todoloo-gradient-start), var(--color-todoloo-gradient-end))'
        }}
        aria-label="New Todo"
      >
        <span className="text-white text-2xl font-light">+</span>
      </button>

      {/* Debug Component */}
      {/* <SharingDebug /> */}
    </div>
  )
}
