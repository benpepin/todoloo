'use client'

import { useState, useEffect, useRef } from 'react'

export function useSimpleTimer() {
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1)
      }, 1000) // Update every 1 second
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
  }, [isRunning])

  const start = () => {
    setIsRunning(true)
    setHasStarted(true)
  }

  const pause = () => {
    setIsRunning(false)
  }

  const stop = () => {
    setIsRunning(false)
  }

  const reset = () => {
    setIsRunning(false)
    setHasStarted(false)
    setSeconds(0)
  }

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

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
