'use client'

import { useEffect, useState } from 'react'
import ToDoList from '@/components/ToDoList'
import HorseRaceProgress from '@/components/HorseRaceProgress'
import ShoppingCartProgress from '@/components/ShoppingCartProgress'
import SettingsMenu from '@/components/SettingsMenu'
import MobileListTabs from '@/components/MobileListTabs'
import { useToDoStore } from '@/store/toDoStore'
import { useSettingsStore } from '@/store/settingsStore'
import { getCurrentDate, getCompletionTime } from '@/utils/timeUtils'
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
    <div className="w-full min-h-screen flex flex-col lg:flex-row lg:h-screen" style={{ backgroundColor: 'var(--color-todoloo-bg)' }}>
      {/* Mobile Header - visible only on mobile/tablet - scrolls with page */}
      <div className="lg:hidden w-full flex flex-col gap-3 p-4"
           style={{
             backgroundColor: 'var(--color-todoloo-sidebar)'
           }}>
        {/* Top row: ListSwitcher + SettingsMenu */}
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <ListSwitcher />
          </div>
          <SettingsMenu />
        </div>

        {/* Horizontal tabs */}
        <MobileListTabs />
      </div>

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
      <div className="w-full lg:w-[80%] lg:h-full lg:overflow-y-auto flex flex-col justify-start items-start gap-2.5 relative"
           style={{ backgroundColor: 'var(--color-todoloo-bg)' }}>

        <div className="lg:fixed left-0 right-0 lg:h-full flex justify-center items-stretch lg:pointer-events-none w-full lg:pt-8 px-4 lg:px-0">
          <div className="w-full max-w-[640px] flex flex-col justify-start items-start lg:h-full lg:pointer-events-auto">
            {/* Large Unified Card Container */}
            <div
              className="w-full min-h-screen lg:h-full rounded-t-[60px] overflow-hidden flex flex-col"
              style={{
                backgroundColor: 'var(--color-todoloo-card)',
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
              {/* Progress Indicator - Fixed on desktop only */}
              <div className="hidden lg:block w-full">
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
              </div>

              {/* Scrollable Todo List Section */}
              <div className="w-full flex-1 lg:overflow-y-auto flex flex-col items-center relative">
                {/* Progress Indicator - Scrollable on mobile only */}
                <div className="lg:hidden w-full mb-4">
                  {showProgressIndicator && isShoppingList && showShoppingCartProgress && (tasks.length > 0 || showCreateTask) && (
                    <div className="w-full overflow-hidden">
                      <ShoppingCartProgress />
                    </div>
                  )}
                  {showProgressIndicator && !isShoppingList && (tasks.length > 0 || showCreateTask) && (
                    <div className="w-full overflow-hidden">
                      <HorseRaceProgress />
                    </div>
                  )}
                </div>

                <div className="w-full max-w-[520px] mx-auto px-4 pb-32 lg:pb-24 lg:pt-8">
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
          className="fixed rounded-full flex items-center justify-center active:scale-95 transition-transform hover:scale-110 hover:cursor-pointer z-50 left-1/2 -translate-x-1/2 lg:left-auto lg:right-6 lg:translate-x-0"
          style={{
            width: 64,
            height: 64,
            padding: 4,
            bottom: '24px',
            background: 'transparent',
            boxShadow: '0px 2px 7px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            outline: '1px #FFFDFA solid',
            outlineOffset: '-1px'
          }}
          aria-label="New Todo"
        >
          {/* Gradient overlay - clipped to circle */}
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
            <defs>
              <clipPath id="circleClip">
                <circle cx="32" cy="32" r="32" />
              </clipPath>
              <filter id="filter0_g_640_7" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                <feTurbulence type="fractalNoise" baseFrequency="2 2" numOctaves="3" seed="9553" />
                <feDisplacementMap in="shape" scale="8" xChannelSelector="R" yChannelSelector="G" result="displacedImage" width="100%" height="100%" />
                <feMerge result="effect1_texture_640_7">
                  <feMergeNode in="displacedImage"/>
                </feMerge>
              </filter>
              <linearGradient id="paint0_linear_640_7" x1="0" y1="64" x2="64" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#D0A69B"/>
                <stop offset="12%" stopColor="#E5BB95"/>
                <stop offset="23%" stopColor="#F0D7A0"/>
                <stop offset="30%" stopColor="#DFE8C7"/>
                <stop offset="40%" stopColor="#E4E9D7"/>
                <stop offset="50%" stopColor="#DFE4E2"/>
                <stop offset="70%" stopColor="#CFDADF"/>
                <stop offset="90%" stopColor="#A4BBD3"/>
                <stop offset="100%" stopColor="#A7A6BC"/>
              </linearGradient>
            </defs>
            <g clipPath="url(#circleClip)">
              <rect x="0" y="0" width="64" height="64" fill="url(#paint0_linear_640_7)" filter="url(#filter0_g_640_7)"/>
            </g>
          </svg>
          {/* Logo icon */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'relative', zIndex: 1 }}>
            <rect x="0.5" y="0.5" width="19" height="19" rx="2.5" stroke="#2F3735" strokeOpacity="0.16"/>
            <path d="M12.199 14.92V9.35739C12.199 8.71478 11.9914 8.18596 11.5764 7.77094C11.1748 7.35592 10.6527 7.14841 10.0101 7.14841C9.58165 7.14841 9.2001 7.24212 8.86541 7.42955C8.53071 7.61698 8.26965 7.87804 8.08222 8.21274C7.8948 8.54743 7.80108 8.92898 7.80108 9.35739L6.93757 8.87543C6.93757 8.1391 7.09822 7.4898 7.41953 6.92751C7.74084 6.35184 8.18263 5.90335 8.74492 5.58204C9.32059 5.24735 9.9632 5.08 10.6728 5.08C11.3957 5.08 12.0383 5.26743 12.6006 5.64229C13.1629 6.00376 13.6047 6.47902 13.926 7.06808C14.2473 7.64376 14.4079 8.24621 14.4079 8.87543V14.92H12.199ZM5.5921 14.92V5.28082H7.80108V14.92H5.5921Z" fill="#2F3735"/>
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
