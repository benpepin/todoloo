'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface AudioPlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  hasEnded: boolean
}

export function useAudioPlayback(audioUrl?: string) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [hasEnded, setHasEnded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element when URL changes
  useEffect(() => {
    if (!audioUrl) {
      // Clean up if no URL
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setHasEnded(false)
      setError(null)
      return
    }

    // Create new audio element
    const audio = new Audio(audioUrl)
    audioRef.current = audio

    // Set up event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setError(null)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setHasEnded(true)
      setCurrentTime(0)
    }

    const handleError = () => {
      setError('Failed to load audio')
      setIsPlaying(false)
    }

    const handleCanPlay = () => {
      setError(null)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)

    // Cleanup
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.pause()
    }
  }, [audioUrl])

  // Play audio
  const play = useCallback(async () => {
    if (!audioRef.current) return

    try {
      await audioRef.current.play()
      setIsPlaying(true)
      setHasEnded(false)
      setError(null)
    } catch (err) {
      console.error('Failed to play audio:', err)
      setError('Failed to play audio')
      setIsPlaying(false)
    }
  }, [])

  // Pause audio
  const pause = useCallback(() => {
    if (!audioRef.current) return

    audioRef.current.pause()
    setIsPlaying(false)
  }, [])

  // Stop audio (pause and reset to beginning)
  const stop = useCallback(() => {
    if (!audioRef.current) return

    audioRef.current.pause()
    audioRef.current.currentTime = 0
    setIsPlaying(false)
    setCurrentTime(0)
    setHasEnded(false)
  }, [])

  // Seek to specific time
  const seek = useCallback((time: number) => {
    if (!audioRef.current) return

    audioRef.current.currentTime = time
    setCurrentTime(time)
    setHasEnded(false)
  }, [])

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  return {
    isPlaying,
    currentTime,
    duration,
    hasEnded,
    error,
    play,
    pause,
    stop,
    seek,
    togglePlayPause,
    audioElement: audioRef.current
  }
}
