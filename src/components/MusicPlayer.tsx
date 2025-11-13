'use client'

import { useEffect } from 'react'
import { Music, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { useAudioPlayback } from '@/hooks/useAudioPlayback'

interface MusicPlayerProps {
  taskId: string
  musicUrl?: string
  musicGenerationStatus?: 'idle' | 'generating' | 'ready' | 'error'
  isTaskActive: boolean
  isTaskPaused: boolean
  onRetry: () => void
}

export function MusicPlayer({
  taskId,
  musicUrl,
  musicGenerationStatus = 'idle',
  isTaskActive,
  isTaskPaused,
  onRetry
}: MusicPlayerProps) {
  const { isPlaying, play, pause, stop, error } = useAudioPlayback(musicUrl)

  // Auto-play when task starts (if music is ready)
  useEffect(() => {
    if (isTaskActive && !isTaskPaused && musicUrl && musicGenerationStatus === 'ready') {
      play()
    }
  }, [isTaskActive, isTaskPaused, musicUrl, musicGenerationStatus, play])

  // Auto-pause when task pauses
  useEffect(() => {
    if (isTaskPaused && isPlaying) {
      pause()
    }
  }, [isTaskPaused, isPlaying, pause])

  // Auto-stop when task becomes inactive
  useEffect(() => {
    if (!isTaskActive && isPlaying) {
      stop()
    }
  }, [isTaskActive, isPlaying, stop])

  // Rendering based on status
  if (musicGenerationStatus === 'generating') {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Generating music...</span>
      </div>
    )
  }

  if (musicGenerationStatus === 'error' || error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500">
        <AlertCircle className="h-4 w-4" />
        <span>Music generation failed</span>
        <button
          onClick={onRetry}
          className="ml-2 flex items-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded transition-colors"
          title="Retry music generation"
        >
          <RotateCcw className="h-3 w-3" />
          Retry
        </button>
      </div>
    )
  }

  if (musicGenerationStatus === 'ready' && musicUrl) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Music className={`h-4 w-4 ${isPlaying ? 'text-green-600 animate-pulse' : 'text-gray-400'}`} />
        <span className={isPlaying ? 'text-green-600 font-medium' : 'text-gray-500'}>
          {isPlaying ? 'Playing montage music' : 'Music ready'}
        </span>
      </div>
    )
  }

  return null
}
