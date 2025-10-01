'use client'

import { useEffect } from 'react'
import { Play, Pause, Square, Clock } from 'lucide-react'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { useTaskStore } from '@/store/taskStore'
import { formatDuration } from '@/utils/timeUtils'

interface TimeTrackerProps {
  taskId: string
  estimatedMinutes: number
  isActive: boolean
}

export default function TimeTracker({ taskId, estimatedMinutes, isActive }: TimeTrackerProps) {
  const { 
    isRunning, 
    isPaused, 
    elapsedSeconds, 
    start, 
    pause, 
    resume, 
    stop 
  } = useTimeTracking()
  
  const { 
    setTaskElapsedTime, 
    updateTaskActualTime, 
    pauseTask, 
    resumeTask,
    startTask
  } = useTaskStore()

  // Update elapsed time in store
  useEffect(() => {
    if (isActive && isRunning) {
      setTaskElapsedTime(taskId, elapsedSeconds)
    }
  }, [elapsedSeconds, isActive, isRunning, taskId, setTaskElapsedTime])

  // Handle start/stop when task becomes active/inactive
  useEffect(() => {
    if (isActive && !isRunning) {
      console.log('Task became active, starting timer')
      start()
    } else if (!isActive && isRunning) {
      console.log('Task became inactive, stopping timer')
      stop()
    }
  }, [isActive, isRunning, start, stop])

  const handleStart = () => {
    console.log('Starting timer for task:', taskId)
    // First make the task active, then start the timer
    startTask(taskId)
    start()
  }

  const handlePause = () => {
    pause()
    pauseTask()
  }

  const handleResume = () => {
    resume()
    resumeTask()
  }

  const handleStop = () => {
    const actualMinutes = Math.round(elapsedSeconds / 60)
    updateTaskActualTime(taskId, actualMinutes)
    stop()
  }

  const estimatedSeconds = estimatedMinutes * 60
  const progressPercentage = Math.min((elapsedSeconds / estimatedSeconds) * 100, 100)
  const isOverEstimate = elapsedSeconds > estimatedSeconds

  if (!isActive) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 px-2 rounded-[20px] border border-[#E6E6E6] flex items-center gap-1">
          <Clock className="w-3 h-3 text-[#696969]" />
          <span className="text-xs text-[#696969] font-inter">
            {estimatedMinutes < 60 ? `${estimatedMinutes} mins` : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`}
          </span>
        </div>
        <button
          onClick={handleStart}
          className="p-2 bg-gradient-to-r from-[#9F8685] to-[#583636] rounded-[10px] hover:opacity-90 transition-opacity"
        >
          <Play className="w-4 h-4 text-white" />
        </button>
      </div>
    )
  }

  console.log('TimeTracker rendering - isActive:', isActive, 'isRunning:', isRunning, 'elapsedSeconds:', elapsedSeconds)

  return (
    <div className="flex items-center gap-2">
      {/* Timer Display */}
      <div className="h-6 px-2 rounded-[20px] border border-[#E6E6E6] flex items-center gap-1">
        <Clock className="w-3 h-3 text-[#696969]" />
        <span className="text-xs text-[#696969] font-inter">
          {formatDuration(elapsedSeconds)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex-1 max-w-20">
        <div className="w-full h-1 bg-[#E6E6E6] rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              isOverEstimate ? 'bg-red-400' : 'bg-[#9F8685]'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Time Comparison */}
      <div className="text-xs text-[#696969] font-inter">
        {isOverEstimate ? (
          <span className="text-red-500">
            +{Math.round((elapsedSeconds - estimatedSeconds) / 60)}m
          </span>
        ) : (
          <span className="text-green-500">
            -{Math.round((estimatedSeconds - elapsedSeconds) / 60)}m
          </span>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="p-2 bg-gradient-to-r from-[#9F8685] to-[#583636] rounded-[10px] hover:opacity-90 transition-opacity"
          >
            <Play className="w-4 h-4 text-white" />
          </button>
        ) : isPaused ? (
          <button
            onClick={handleResume}
            className="p-2 bg-green-500 rounded-[10px] hover:bg-green-600 transition-colors"
          >
            <Play className="w-4 h-4 text-white" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="p-2 bg-yellow-500 rounded-[10px] hover:bg-yellow-600 transition-colors"
          >
            <Pause className="w-4 h-4 text-white" />
          </button>
        )}
        
        <button
          onClick={handleStop}
          className="p-2 bg-red-500 rounded-[10px] hover:bg-red-600 transition-colors"
        >
          <Square className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  )
}
