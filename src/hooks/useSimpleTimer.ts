'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface TimerState {
  isRunning: boolean
  hasStarted: boolean
  startTime: number | null
  pausedTime: number
  lastUpdateTime: number
}

export function useSimpleTimer(taskId?: string) {
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const stateRef = useRef<TimerState>({
    isRunning: false,
    hasStarted: false,
    startTime: null,
    pausedTime: 0,
    lastUpdateTime: Date.now()
  })

  // Storage key for persisting timer state
  const storageKey = taskId ? `timer_${taskId}` : 'timer_default'

  // Clear any corrupted timer data on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Clear any corrupted timer data from previous versions
    try {
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (key.startsWith('timer_') || key === 'timer_default') {
          const value = localStorage.getItem(key)
          if (value) {
            try {
              JSON.parse(value)
            } catch {
              console.log(`[Timer] Clearing corrupted data for key: ${key}`)
              localStorage.removeItem(key)
            }
          }
        }
      })
    } catch (error) {
      console.warn('Failed to clean up corrupted timer data:', error)
    }
  }, [])

  // Load timer state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const savedState = localStorage.getItem(storageKey)
      console.log(`[Timer ${taskId || 'default'}] Loading from localStorage:`, savedState)
      
      if (savedState && savedState.trim() !== '') {
        let parsedState: TimerState
        try {
          parsedState = JSON.parse(savedState)
        } catch (parseError) {
          console.warn(`[Timer ${taskId || 'default'}] Invalid JSON in localStorage, clearing:`, parseError)
          localStorage.removeItem(storageKey)
          return
        }
        
        console.log(`[Timer ${taskId || 'default'}] Parsed state:`, parsedState)
        
        // Validate the parsed state has required properties
        if (!parsedState || typeof parsedState !== 'object') {
          console.warn(`[Timer ${taskId || 'default'}] Invalid state object, clearing localStorage`)
          localStorage.removeItem(storageKey)
          return
        }
        
        // If timer was running when saved, calculate elapsed time and update state
        if (parsedState.isRunning && parsedState.startTime && typeof parsedState.startTime === 'number') {
          const now = Date.now()
          const elapsed = Math.floor((now - parsedState.startTime) / 1000) + (parsedState.pausedTime || 0)
          console.log(`[Timer ${taskId || 'default'}] Restoring running timer - elapsed: ${elapsed}s`)
          
          // Update the state with current time and reset startTime to now
          stateRef.current = {
            isRunning: true,
            hasStarted: true,
            startTime: now,
            pausedTime: elapsed,
            lastUpdateTime: now
          }
          
          setSeconds(elapsed)
          setIsRunning(true)
          setHasStarted(true)
        } else if (parsedState.hasStarted && typeof parsedState.pausedTime === 'number') {
          // Timer was paused, restore the paused state
          console.log(`[Timer ${taskId || 'default'}] Restoring paused timer - paused time: ${parsedState.pausedTime}s`)
          stateRef.current = {
            isRunning: false,
            hasStarted: true,
            startTime: null,
            pausedTime: parsedState.pausedTime,
            lastUpdateTime: Date.now()
          }
          setSeconds(parsedState.pausedTime)
          setHasStarted(true)
        } else {
          console.log(`[Timer ${taskId || 'default'}] Invalid state structure, ignoring`)
        }
      } else {
        console.log(`[Timer ${taskId || 'default'}] No saved state found`)
      }
    } catch (error) {
      console.warn(`[Timer ${taskId || 'default'}] Failed to load timer state from localStorage:`, error)
      // Clear potentially corrupted data
      try {
        localStorage.removeItem(storageKey)
      } catch (clearError) {
        console.warn('Failed to clear corrupted localStorage:', clearError)
      }
    }
  }, [storageKey])

  // Save timer state to localStorage whenever it changes
  const saveState = useCallback(() => {
    if (typeof window === 'undefined') return

    try {
      console.log(`[Timer ${taskId || 'default'}] Saving state:`, stateRef.current)
      localStorage.setItem(storageKey, JSON.stringify(stateRef.current))
    } catch (error) {
      console.warn('Failed to save timer state to localStorage:', error)
    }
  }, [storageKey, taskId])

  // Update timer display
  const updateTimer = useCallback(() => {
    if (!stateRef.current.isRunning || !stateRef.current.startTime) return

    const now = Date.now()
    const elapsed = Math.floor((now - stateRef.current.startTime) / 1000) + stateRef.current.pausedTime
    setSeconds(elapsed)
    stateRef.current.lastUpdateTime = now
  }, [])

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden - save current state
        saveState()
      } else {
        // Tab became visible - update timer if it was running
        if (stateRef.current.isRunning && stateRef.current.startTime) {
          updateTimer()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [saveState, updateTimer])

  // Handle page focus/blur
  useEffect(() => {
    const handleFocus = () => {
      if (stateRef.current.isRunning && stateRef.current.startTime) {
        updateTimer()
      }
    }

    const handleBlur = () => {
      saveState()
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [saveState, updateTimer])

  // Main timer interval
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(updateTimer, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, updateTimer])

  const start = useCallback(() => {
    const now = Date.now()
    stateRef.current = {
      isRunning: true,
      hasStarted: true,
      startTime: now,
      pausedTime: stateRef.current.pausedTime,
      lastUpdateTime: now
    }
    setIsRunning(true)
    setHasStarted(true)
    saveState()
  }, [saveState])

  const pause = useCallback(() => {
    if (stateRef.current.isRunning && stateRef.current.startTime) {
      const now = Date.now()
      const elapsed = Math.floor((now - stateRef.current.startTime) / 1000)
      stateRef.current.pausedTime += elapsed
    }
    
    stateRef.current = {
      ...stateRef.current,
      isRunning: false,
      startTime: null,
      lastUpdateTime: Date.now()
    }
    setIsRunning(false)
    saveState()
  }, [saveState])

  const stop = useCallback(() => {
    stateRef.current = {
      isRunning: false,
      hasStarted: false,
      startTime: null,
      pausedTime: 0,
      lastUpdateTime: Date.now()
    }
    setIsRunning(false)
    setHasStarted(false)
    setSeconds(0)
    saveState()
  }, [saveState])

  const reset = useCallback(() => {
    stateRef.current = {
      isRunning: false,
      hasStarted: false,
      startTime: null,
      pausedTime: 0,
      lastUpdateTime: Date.now()
    }
    setIsRunning(false)
    setHasStarted(false)
    setSeconds(0)
    saveState()
  }, [saveState])

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      saveState()
    }
  }, [saveState])

  return {
    seconds,
    isRunning,
    hasStarted,
    start,
    pause,
    stop,
    reset,
    formatTime
  }
}
