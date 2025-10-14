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

  // Load timer state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const savedState = localStorage.getItem(storageKey)
      if (!savedState?.trim()) return

      const parsedState: TimerState = JSON.parse(savedState)
      if (!parsedState || typeof parsedState !== 'object' || !parsedState.hasStarted) return

      const now = Date.now()

      if (parsedState.isRunning && typeof parsedState.startTime === 'number') {
        // Timer was running - calculate current elapsed time
        const elapsed = Math.floor((now - parsedState.startTime) / 1000)
        stateRef.current = {
          isRunning: true,
          hasStarted: true,
          startTime: parsedState.startTime,
          pausedTime: 0,
          lastUpdateTime: now
        }
        setSeconds(elapsed)
        setIsRunning(true)
        setHasStarted(true)
      } else if (!parsedState.isRunning && typeof parsedState.pausedTime === 'number') {
        // Timer was paused - restore paused state
        stateRef.current = {
          isRunning: false,
          hasStarted: true,
          startTime: null,
          pausedTime: parsedState.pausedTime,
          lastUpdateTime: now
        }
        setSeconds(parsedState.pausedTime)
        setIsRunning(false)
        setHasStarted(true)
      }
    } catch (error) {
      // Clear corrupted data silently
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  // Save timer state to localStorage whenever it changes
  const saveState = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(storageKey, JSON.stringify(stateRef.current))
    } catch (error) {
      // Silently fail if localStorage is unavailable
    }
  }, [storageKey, taskId])

  // Update timer display - calculate from original startTime
  const updateTimer = useCallback(() => {
    if (!stateRef.current.startTime) return

    const now = Date.now()
    const elapsed = Math.floor((now - stateRef.current.startTime) / 1000)
    setSeconds(elapsed)
    stateRef.current.lastUpdateTime = now
  }, [])

  // Handle visibility change (tab switching) - just save state, don't pause
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden - save current state but keep timer running
        saveState()
      } else {
        // Tab became visible - update timer if it has started
        if (stateRef.current.hasStarted && stateRef.current.startTime) {
          updateTimer()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [saveState, updateTimer])

  // Handle page focus/blur - just save state, don't pause
  useEffect(() => {
    const handleFocus = () => {
      if (stateRef.current.hasStarted && stateRef.current.startTime) {
        updateTimer()
      }
    }

    const handleBlur = () => {
      // Save state when losing focus but keep timer running
      saveState()
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [saveState, updateTimer])

  // Main timer interval - runs when timer is running
  useEffect(() => {
    if (isRunning && stateRef.current.startTime) {
      intervalRef.current = setInterval(updateTimer, 1000)
      // Update immediately on start/resume
      updateTimer()
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

    // If resuming from pause, use pausedTime as base
    if (stateRef.current.hasStarted && stateRef.current.pausedTime > 0) {
      stateRef.current = {
        isRunning: true,
        hasStarted: true,
        startTime: now - (stateRef.current.pausedTime * 1000), // Adjust startTime to include paused time
        pausedTime: 0,
        lastUpdateTime: now
      }
    } else if (!stateRef.current.startTime) {
      // Fresh start
      stateRef.current = {
        isRunning: true,
        hasStarted: true,
        startTime: now,
        pausedTime: 0,
        lastUpdateTime: now
      }
    } else {
      // Already running, just update state
      stateRef.current = {
        ...stateRef.current,
        isRunning: true,
        hasStarted: true,
        lastUpdateTime: now
      }
    }

    setIsRunning(true)
    setHasStarted(true)
    saveState()
  }, [saveState])

  const pause = useCallback(() => {
    // When paused, save current elapsed time and stop counting
    if (stateRef.current.startTime) {
      const now = Date.now()
      const elapsed = Math.floor((now - stateRef.current.startTime) / 1000)

      stateRef.current = {
        isRunning: false,
        hasStarted: true,
        startTime: null, // Clear startTime when paused
        pausedTime: elapsed, // Store the elapsed time
        lastUpdateTime: now
      }

      setSeconds(elapsed)
      setIsRunning(false)
      saveState()
    }
  }, [saveState])

  const clearTimer = useCallback(() => {
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  const stop = clearTimer
  const reset = clearTimer

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
    return () => saveState()
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
