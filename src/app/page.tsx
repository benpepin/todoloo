'use client'

import { useEffect, useState } from 'react'
import ToDoList from '@/components/ToDoList'
import HorseRaceProgress from '@/components/HorseRaceProgress'
import ShoppingCartProgress from '@/components/ShoppingCartProgress'
import SettingsMenu from '@/components/SettingsMenu'
import MobileListSheet from '@/components/MobileListSheet'
import { useToDoStore } from '@/store/toDoStore'
import { useSettingsStore } from '@/store/settingsStore'
import { getCurrentDate, getCompletionTime } from '@/utils/timeUtils'
import { ChevronDown } from 'lucide-react'
import { migrateLocalStorageToSupabase } from '@/lib/migrate-to-supabase'
import { useSupabase } from '@/components/SupabaseProvider'
import Auth from '@/components/Auth'
import ListSwitcher from '@/components/ListSwitcher'
import PersonalLists from '@/components/PersonalLists'

export default function Home() {
  const { user, loading: authLoading } = useSupabase()
  const toggleCreateTask = useToDoStore((state) => state.toggleCreateTask)
  const showCreateTask = useToDoStore((state) => state.showCreateTask)
  const tasks = useToDoStore((state) => state.tasks)
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
  const [isMobileListSheetOpen, setIsMobileListSheetOpen] = useState(false)

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
  const currentListName = currentList?.name || 'My List'

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
      // Block Command+N / Ctrl+N
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        return
      }

      // Only trigger if no input/textarea is focused
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      )

      if (!isInputFocused) {
        // Handle 'n' key for new to do (without modifier keys)
        if (event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
          event.preventDefault()
          toggleCreateTask()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleCreateTask])

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
      <div className="lg:hidden w-full p-4 border-b"
           style={{
             backgroundColor: 'var(--color-todoloo-sidebar)',
             borderColor: 'var(--color-todoloo-border)'
           }}>
        <div className="flex justify-between items-center gap-3">
          {/* List Selection Button */}
          <button
            onClick={() => setIsMobileListSheetOpen(true)}
            className="flex-1 flex items-center justify-between gap-2 py-3 px-4 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--color-todoloo-card)',
              minHeight: '44px'
            }}
          >
            <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
              <span
                className="text-base font-semibold font-['Outfit'] truncate w-full text-left"
                style={{ color: 'var(--color-todoloo-text-primary)' }}
              >
                {currentListName}
              </span>
              <span
                className="text-sm font-['Outfit'] font-normal"
                style={{ color: 'var(--color-todoloo-text-secondary)' }}
              >
                {totalMinutes === 0 ? (
                  "You're done!"
                ) : (
                  `Done at ${completionTime}`
                )}
              </span>
            </div>
            <ChevronDown
              size={20}
              style={{ color: 'var(--color-todoloo-text-secondary)' }}
              className="flex-shrink-0"
            />
          </button>

          {/* Settings Menu */}
          <SettingsMenu />
        </div>
      </div>

      {/* Mobile List Sheet */}
      <MobileListSheet
        isOpen={isMobileListSheetOpen}
        onClose={() => setIsMobileListSheetOpen(false)}
      />

      {/* Desktop Sidebar - hidden on mobile/tablet */}
      <div className="hidden lg:flex lg:w-[20%] h-full p-8 flex-col items-start"
           style={{
             backgroundColor: 'var(--color-todoloo-sidebar)',
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
            className="w-full text-base font-['Outfit'] font-normal cursor-pointer transition-colors duration-200 hover:opacity-70"
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
      <div className="w-full lg:w-[80%] h-full overflow-y-auto flex flex-col justify-start items-start gap-2.5 relative"
           style={{ backgroundColor: 'var(--color-todoloo-bg)' }}>

        <div className="fixed left-0 right-0 h-full flex justify-center items-stretch pointer-events-none" style={{ paddingTop: '32px' }}>
          <div className="w-full max-w-[640px] flex flex-col justify-start items-start h-full pointer-events-auto">
            {/* Large Unified Card Container */}
            <div
              className="w-full h-full rounded-t-[60px] overflow-hidden flex flex-col"
              style={{
                backgroundColor: 'var(--color-todoloo-bg)',
                boxShadow: '0px 4px 14px 10px rgba(0, 0, 0, 0.02)',
                ...(tasks.length === 0 && !showCreateTask
                  ? {
                      border: '1px var(--color-todoloo-border) solid'
                    }
                  : {
                      outline: '1px var(--color-todoloo-border) solid',
                      outlineOffset: '-1px',
                      padding: '1px'
                    }
                )
              }}
            >
              {/* Progress Indicator - Fixed at top - Shopping Cart for shopping lists, Horse for others - Full Width */}
              {showProgressIndicator && isShoppingList && showShoppingCartProgress && (tasks.length > 0 || showCreateTask) && (
                <div className="w-full rounded-t-[56px] overflow-hidden flex-shrink-0"
                     style={{
                       backgroundColor: 'var(--color-todoloo-bg)',
                       outline: '1px var(--color-todoloo-border) solid'
                     }}>
                  <ShoppingCartProgress />
                </div>
              )}
              {showProgressIndicator && !isShoppingList && (tasks.length > 0 || showCreateTask) && (
                <div className="w-full rounded-t-[56px] overflow-hidden flex-shrink-0"
                     style={{
                       backgroundColor: 'var(--color-todoloo-bg)',
                       outline: '1px var(--color-todoloo-border) solid'
                     }}>
                  <HorseRaceProgress />
                </div>
              )}

              {/* Scrollable Todo List Section */}
              <div className="w-full flex-1 overflow-y-auto flex flex-col items-center relative" style={{ paddingTop: '64px' }}>
                <div className="w-full max-w-[520px] mx-auto px-4 pb-8">
                  <ToDoList />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Debug Component */}
      {/* <SharingDebug /> */}

      {/* Floating Action Button - Fixed bottom right of window - Hidden in empty state */}
      {!(tasks.length === 0 && !showCreateTask) && (
        <button
          onClick={toggleCreateTask}
          className="fixed w-[72px] h-[72px] rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:shadow-xl hover:scale-110 hover:cursor-pointer z-50"
          style={{
            bottom: '24px',
            right: '24px',
            backgroundColor: 'var(--color-todoloo-card)',
            outline: '1px var(--color-todoloo-border) solid',
            outlineOffset: '-1px'
          }}
          aria-label="New Todo"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="var(--color-todoloo-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Toast Notifications - Fixed bottom right */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-md">
        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg shadow-lg">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <h3 className="text-red-800 font-medium text-sm">Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="text-red-600 hover:text-red-800 text-sm font-medium flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-4 bg-blue-100 border border-blue-300 rounded-lg shadow-lg">
            <p className="text-blue-800 text-sm">Loading tasks...</p>
          </div>
        )}

        {/* Migration Status - Only show if there's an actual migration happening */}
        {migrationStatus && migrationStatus !== 'Already migrated' && (
          <div className="p-4 bg-green-100 border border-green-300 rounded-lg shadow-lg">
            <p className="text-green-800 text-sm">{migrationStatus}</p>
          </div>
        )}
      </div>
    </div>
  )
}
