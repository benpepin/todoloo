'use client'

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Check, GripVertical, Timer, ChevronDown, Plus, Play, Pause } from 'lucide-react'
import { Task } from '@/types'
import { useToDoStore } from '@/store/toDoStore'
import { useSimpleTimer } from '@/hooks/useSimpleTimer'
import AnimatedBorder from './AnimatedBorder'
import { AnimatedBars } from './AnimatedBars'

interface SortableTaskItemProps {
  task: Task
  taskIndex: number
  onDelete: (id: string) => void
  onToggleCompletion: (id: string) => void
  isTaskActive: boolean
  groupPosition?: 'single' | 'first' | 'middle' | 'last'
  isDropTarget?: boolean
}

export default function SortableTaskItem({
  task,
  taskIndex,
  onDelete,
  onToggleCompletion,
  isTaskActive,
  groupPosition = 'single',
  isDropTarget = false
}: SortableTaskItemProps) {
  const [editDescription, setEditDescription] = useState(task.description)
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState(task.estimatedMinutes)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
  const customTimeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [, setShowEditButtons] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  
  const descriptionInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const taskCardRef = useRef<HTMLDivElement>(null)
  
  const commonTimes = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
  ]
  
  const updateTaskDescription = useToDoStore((state) => state.updateTaskDescription)
  const updateTaskEstimatedTime = useToDoStore((state) => state.updateTaskEstimatedTime)
  const updateTaskActualTime = useToDoStore((state) => state.updateTaskActualTime)
  const editingTaskId = useToDoStore((state) => state.editingTaskId)
  const setEditingTask = useToDoStore((state) => state.setEditingTask)
  const clearEditingTask = useToDoStore((state) => state.clearEditingTask)
  const startTask = useToDoStore((state) => state.startTask)
  const stopTask = useToDoStore((state) => state.stopTask)
  const activeTaskId = useToDoStore((state) => state.activeTaskId)
  
  const isEditing = editingTaskId === task.id
  const isActive = activeTaskId === task.id
  const { seconds, isRunning, hasStarted, start, pause, formatTime } = useSimpleTimer(task.id)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  // Update local state when to do changes
  useEffect(() => {
    setEditDescription(task.description)
    setEditEstimatedMinutes(task.estimatedMinutes)
  }, [task.description, task.estimatedMinutes])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && descriptionInputRef.current) {
      descriptionInputRef.current.focus()
      descriptionInputRef.current.select()
    }
  }, [isEditing])

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Save custom time if there's a value in the input
        const minutes = parseInt(customMinutes)
        if (minutes > 0) {
          setEditEstimatedMinutes(minutes)
          setCustomMinutes('')
          updateTaskEstimatedTime(task.id, minutes)
        }
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [customMinutes, task.id, updateTaskEstimatedTime])

  // Handle click outside to do card to save edits
  useEffect(() => {
    function handleClickOutsideTaskCard(event: MouseEvent) {
      if (isEditing && taskCardRef.current && !taskCardRef.current.contains(event.target as Node)) {
        // Save the current edits when clicking outside
        if (editDescription.trim()) {
          updateTaskDescription(task.id, editDescription.trim())
          updateTaskEstimatedTime(task.id, editEstimatedMinutes)
        }
        setIsAnimatingOut(true)
        setTimeout(() => {
          clearEditingTask()
          setShowEditButtons(false)
          setIsAnimatingOut(false)
        }, 150)
      }
    }

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutsideTaskCard)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideTaskCard)
    }
  }, [isEditing, editDescription, editEstimatedMinutes, task.id, updateTaskDescription, updateTaskEstimatedTime, clearEditingTask])

  // Handle when editing to do changes - auto-save if we were editing
  useEffect(() => {
    if (isEditing && editingTaskId !== task.id) {
      // We were editing this to do but now another to do is being edited
      // Auto-save our changes
      if (editDescription.trim()) {
        updateTaskDescription(task.id, editDescription.trim())
        updateTaskEstimatedTime(task.id, editEstimatedMinutes)
      }
      setIsAnimatingOut(true)
      setTimeout(() => {
        setShowEditButtons(false)
        setIsAnimatingOut(false)
      }, 150)
    }
  }, [editingTaskId, task.id, isEditing, editDescription, editEstimatedMinutes, updateTaskDescription, updateTaskEstimatedTime])

  // Handle timer start/resume when to do becomes active
  useEffect(() => {
    if (isActive && hasStarted) {
      // Task is active and timer already started - resume if needed
      start()
    } else if (isActive && !hasStarted) {
      // Task is active and timer hasn't started - start fresh
      start()
    }
    // Note: We don't automatically pause when inactive - timer continues in background
  }, [isActive, start, hasStarted])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (customTimeTimeoutRef.current) {
        clearTimeout(customTimeTimeoutRef.current)
      }
    }
  }, [])

  const handleStartTask = () => {
    startTask(task.id)
  }

  const handlePauseTask = () => {
    pause() // Actually pause the timer
    stopTask() // Stop tracking active task
  }


  const handleToggleCompletion = () => {
    const isCompleting = !task.isCompleted

    // If completing the task while timer is running, pause it first
    if (isCompleting && isRunning && hasStarted) {
      pause() // Stop the timer from running
    }

    // If completing the to do and we have timer data, save the actual time
    if (isCompleting && hasStarted && seconds > 0) {
      const actualMinutes = Math.round(seconds / 60) || 1 // At least 1 minute
      updateTaskActualTime(task.id, actualMinutes)
    }
    // If completing while active, stop task tracking
    if (isCompleting && isActive) {
      stopTask()
    }
    onToggleCompletion(task.id)
  }

  const handleEdit = () => {
    // Allow editing both completed and incomplete todos
    
    // If another to do is being edited, we need to save its current values
    // This will be handled by the component that's currently being edited
    // when it detects the editingTaskId change
    
    setEditingTask(task.id)
    setShowEditButtons(true)
  }

  const handleSave = () => {
    if (editDescription.trim()) {
      updateTaskDescription(task.id, editDescription.trim())
      updateTaskEstimatedTime(task.id, editEstimatedMinutes)
    }
    setIsAnimatingOut(true)
    setTimeout(() => {
      clearEditingTask()
      setShowEditButtons(false)
      setIsAnimatingOut(false)
    }, 150)
  }

  const handleCancel = () => {
    setEditDescription(task.description)
    setEditEstimatedMinutes(task.estimatedMinutes)
    setIsAnimatingOut(true)
    setTimeout(() => {
      clearEditingTask()
      setShowEditButtons(false)
      setIsAnimatingOut(false)
    }, 150)
  }

  const handleTimeSelect = (minutes: number) => {
    setEditEstimatedMinutes(minutes)
    setIsDropdownOpen(false)
    // Return focus to description input so user can hit Enter to save
    setTimeout(() => {
      if (descriptionInputRef.current) {
        descriptionInputRef.current.focus()
      }
    }, 0)
  }

  const handleCustomTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const minutes = parseInt(customMinutes)
    if (minutes > 0) {
      setEditEstimatedMinutes(minutes)
      setCustomMinutes('')
      // Save the time change to the store
      updateTaskEstimatedTime(task.id, minutes)
      setIsDropdownOpen(false)
      // Return focus to description input so user can hit Enter to save
      setTimeout(() => {
        if (descriptionInputRef.current) {
          descriptionInputRef.current.focus()
        }
      }, 0)
    }
  }

  const handleCustomTimeBlur = () => {
    const minutes = parseInt(customMinutes)
    if (minutes > 0) {
      setEditEstimatedMinutes(minutes)
      setCustomMinutes('')
      // Save the time change to the store
      updateTaskEstimatedTime(task.id, minutes)
      // Close dropdown after a short delay to allow the blur to complete
      setTimeout(() => {
        setIsDropdownOpen(false)
      }, 100)
    }
  }

  const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomMinutes(value)
    
    // Clear existing timeout
    if (customTimeTimeoutRef.current) {
      clearTimeout(customTimeTimeoutRef.current)
    }
    
    // Set a new timeout to save after user stops typing
    customTimeTimeoutRef.current = setTimeout(() => {
      const minutes = parseInt(value)
      if (minutes > 0) {
        setEditEstimatedMinutes(minutes)
        updateTaskEstimatedTime(task.id, minutes)
      }
    }, 1000) // Save after 1 second of no typing
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  }

  const formatEstimatedTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes}m` : `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  return (
    <AnimatedBorder isActive={isActive}>
      <div className="relative w-full group max-w-[460px]">
        {/* Drag Handle - Positioned absolutely to not affect card width */}
        <button
          className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 z-10 hover:bg-[var(--muted)]"
          style={{ 
            color: 'var(--color-todoloo-text-secondary)'
          }}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        
        {/* Task Card */}
        <div
          ref={(node) => {
            setNodeRef(node)
            taskCardRef.current = node
          }}
          className={`w-full shadow-[2px_2px_4px_rgba(0,0,0,0.15)] group ${
            isDragging ? 'opacity-50 shadow-xl z-50' : 'transition-all duration-200'
          } ${isActive ? 'ring-2' : ''} ${isEditing ? 'p-6' : 'p-6'} ${
            isDropTarget ? 'ring-4 ring-blue-400 scale-105' : ''
          } ${
            groupPosition === 'single' ? 'rounded-[20px]' :
            groupPosition === 'first' ? 'rounded-t-[20px]' :
            groupPosition === 'last' ? 'rounded-b-[20px]' :
            ''
          }`}
          style={{
            ...style,
            backgroundColor: isDropTarget ? '#EEF2FF' : 'var(--color-todoloo-card)'
          }}
          onMouseEnter={() => setShowEditButtons(true)}
          onMouseLeave={() => !isEditing && setShowEditButtons(false)}
        >
          {isEditing ? (
            // Edit mode - looks like TaskCard
            <div className={`flex flex-col gap-8 transition-all duration-150 ${
              isAnimatingOut 
                ? 'animate-out fade-out-0' 
                : 'animate-in fade-in-0'
            }`}>
              <div className="flex items-center">
                <input
                  ref={descriptionInputRef}
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write something that will disappoint your future self"
                  className="flex-1 text-base font-inter bg-transparent border-none outline-none"
                  style={{ 
                    color: 'var(--color-todoloo-text-primary)'
                  }}
                />
              </div>
              
              <div className="flex justify-between items-end">
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="h-8 px-3 rounded-[20px] border flex items-center gap-1 transition-colors cursor-pointer"
                    style={{
                      borderColor: 'var(--color-todoloo-border)',
                      backgroundColor: isDropdownOpen ? 'var(--color-todoloo-muted)' : 'var(--color-todoloo-card)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isDropdownOpen) {
                        e.currentTarget.style.backgroundColor = 'var(--color-todoloo-muted)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDropdownOpen) {
                        e.currentTarget.style.backgroundColor = 'var(--color-todoloo-card)'
                      }
                    }}
                  >
                    <Timer className="w-3.5 h-3.5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                    <span className="text-xs font-inter" style={{ color: 'var(--color-todoloo-text-secondary)', transform: 'translateY(1px)' }}>
                      {formatEstimatedTime(editEstimatedMinutes)}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform translate-y-px ${isDropdownOpen ? 'rotate-180' : ''}`} 
                                 style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute top-9 left-0 w-48 bg-[#FEFFFF] rounded-[20px] border border-[#D9D9D9] shadow-[0px_4px_54px_rgba(0,0,0,0.05)] p-2 z-10">
                      <div className="space-y-1">
                        {commonTimes.map((time) => (
                          <button
                            key={time.value}
                            type="button"
                            onClick={() => handleTimeSelect(time.value)}
                            className="w-full text-left px-3 py-2 text-xs text-[#696969] font-inter hover:bg-[#F5F5F5] rounded-[10px] transition-colors cursor-pointer"
                          >
                            {time.label}
                          </button>
                        ))}
                        <div className="border-t border-[#E6E6E6] my-1"></div>
                        <form onSubmit={handleCustomTimeSubmit} className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={customMinutes}
                              onChange={handleCustomTimeChange}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleCustomTimeSubmit(e)
                                }
                              }}
                              onBlur={handleCustomTimeBlur}
                              placeholder="Custom"
                              min="1"
                              max="999"
                              className="flex-1 text-xs text-[#2D1B1B] font-inter bg-transparent border-none outline-none placeholder:text-[#989999]"
                            />
                            <span className="text-xs text-[#696969] font-inter">minutes</span>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onDelete(task.id)}
                    className="h-8 px-3 text-xs font-inter cursor-pointer transition-colors"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--color-todoloo-text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'red'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--color-todoloo-text-secondary)'
                    }}
                    aria-label="Delete task"
                    title="Delete"
                  >
                    Delete
                  </button>
                  <button
                    onClick={handleSave}
                    className="h-8 px-3 rounded-[20px] hover:opacity-90 transition-opacity cursor-pointer"
                    style={{
                      background: 'linear-gradient(to right, var(--color-todoloo-gradient-start), var(--color-todoloo-gradient-end))',
                      border: 'none'
                    }}
                  >
                    <span className="text-white text-xs font-inter">Save</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Normal display mode - simplified design with hover states
            <div className={`flex items-center gap-6 ${isActive ? 'active' : ''}`}>
              {/* Task number or play/animated bars */}
              <div className="flex items-center justify-center">
                {isRunning && hasStarted ? (
                  // Active task: show animated bars that fade to pause on hover
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <div className="w-8 h-8 flex items-center justify-center group-hover:opacity-0 transition-opacity duration-200" style={{ overflow: 'visible' }}>
                      <AnimatedBars />
                    </div>
                    {/* Pause button */}
                    <button
                      onClick={handlePauseTask}
                      className="absolute top-0 left-0 w-8 h-8 p-2 rounded-lg transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      style={{
                        backgroundColor: '#fef3c7',
                        color: '#d97706'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fde68a'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef3c7'
                      }}
                      title="Pause (timer keeps running)"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  </div>
                ) : !task.isCompleted && hasStarted ? (
                  // Timer started but not active: show timer with play on hover
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <Timer className="w-4 h-4 group-hover:opacity-0 transition-opacity duration-200" style={{ color: 'var(--color-todoloo-text-muted)' }} />
                    <button
                      onClick={handleStartTask}
                      className="absolute top-0 left-0 w-8 h-8 p-2 rounded-lg transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#16a34a'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#bbf7d0'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#dcfce7'
                      }}
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                ) : !task.isCompleted ? (
                  // Inactive task: show play button on hover, number by default
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <span
                      className="font-normal transition-opacity duration-200 group-hover:opacity-0"
                      style={{ color: '#989999', fontSize: 28, fontFamily: 'Inter' }}
                    >
                      {taskIndex}
                    </span>
                    <button
                      onClick={handleStartTask}
                      className="absolute top-0 left-0 w-8 h-8 p-2 rounded-lg transition-all duration-200 cursor-pointer opacity-0 group-hover:opacity-100 flex items-center justify-center"
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#16a34a'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#bbf7d0'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#dcfce7'
                      }}
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  // Completed task: just show the number
                  <span
                    className="font-normal"
                    style={{ color: '#989999', fontSize: 28, fontFamily: 'Inter' }}
                  >
                    {taskIndex}
                  </span>
                )}
              </div>
                
              <div className="flex-1">
                <div
                  className="cursor-text"
                  onClick={handleEdit}
                >
                  <div className="flex flex-col gap-1">
                    <p className={`text-base font-medium ${
                      task.isCompleted ? 'line-through' : ''
                    }`}
                       style={{
                         color: task.isCompleted ? 'var(--color-todoloo-text-muted)' : 'var(--color-todoloo-text-secondary)',
                         fontFamily: 'Geist'
                       }}>
                      {task.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-normal" style={{ color: 'var(--color-todoloo-text-muted)', fontFamily: 'Geist' }}>
                        {task.isCompleted && task.actualMinutes
                          ? formatEstimatedTime(task.actualMinutes)
                          : formatEstimatedTime(task.estimatedMinutes)
                        }
                      </p>
                      {hasStarted && (
                        <p className="text-sm font-medium"
                           style={{
                             color: isActive ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-text-secondary)',
                             fontFamily: 'Geist'
                           }}>
                          • {formatTime(seconds)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox - always visible */}
              <div className="flex items-center justify-center" style={{ width: 56, height: 56 }}>
                <button
                  onClick={handleToggleCompletion}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer relative ${
                    !task.isCompleted ? 'hover:scale-90 transition-transform duration-150 ease-out' : ''
                  } ${
                    task.isCompleted
                      ? ''
                      : 'bg-[#F9F9FD] dark:bg-gray-700 border-[#E8E6E6] dark:border-gray-600'
                  }`}
                  style={{
                    backgroundColor: task.isCompleted ? 'var(--color-todoloo-gradient-start)' : undefined,
                    borderColor: task.isCompleted ? 'var(--color-todoloo-gradient-start)' : undefined,
                    color: task.isCompleted ? 'white' : 'var(--color-todoloo-text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    if (!task.isCompleted) {
                      e.currentTarget.style.borderColor = 'var(--color-todoloo-gradient-start)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!task.isCompleted) {
                      e.currentTarget.style.borderColor = ''
                      e.currentTarget.classList.add('border-[#E8E6E6]', 'dark:border-gray-600')
                    }
                  }}
                >
                  {task.isCompleted && (
                    <>
                      <Check className="w-4 h-4 animate-in zoom-in-50 duration-300" style={{ animationTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }} />
                      <span className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: 'var(--color-todoloo-gradient-start)', animationDuration: '0.6s', animationIterationCount: '1' }} />
                      <span className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: 'var(--color-todoloo-gradient-start)', animationDuration: '0.8s', animationIterationCount: '1', animationDelay: '0.1s' }} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AnimatedBorder>
  )
}
