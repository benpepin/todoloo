'use client'

import { useState, useEffect } from 'react'

interface TimeTrackingState {
  isRunning: boolean
  isPaused: boolean
  elapsedSeconds: number
  startTime: number | null
}

export function useTimeTracking() {
  const [state, setState] = useState<TimeTrackingState>({
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
    startTime: null,
  })
  

  useEffect(() => {
    // Use setInterval instead of Web Worker for now (simpler and more reliable)
    let intervalId: NodeJS.Timeout | null = null

    if (state.isRunning && !state.isPaused) {
      intervalId = setInterval(() => {
        setState(prev => {
          if (prev.startTime) {
            const elapsed = Math.floor((Date.now() - prev.startTime) / 1000)
            return {
              ...prev,
              elapsedSeconds: elapsed
            }
          }
          return prev
        })
      }, 100)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [state.isRunning, state.isPaused, state.startTime])

  const start = () => {
    console.log('useTimeTracking: Starting timer')
    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      startTime: Date.now() - (prev.elapsedSeconds * 1000)
    }))
  }

  const pause = () => {
    setState(prev => ({
      ...prev,
      isPaused: true
    }))
  }

  const resume = () => {
    setState(prev => ({
      ...prev,
      isPaused: false,
      startTime: Date.now() - (prev.elapsedSeconds * 1000)
    }))
  }

  const stop = () => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      startTime: null
    }))
  }

  const reset = () => {
    setState({
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      startTime: null
    })
  }

  return {
    ...state,
    start,
    pause,
    resume,
    stop,
    reset
  }
}
