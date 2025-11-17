'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, Timer, ChevronDown, Play, Pause, MoreHorizontal, Music } from 'lucide-react'
import { Task } from '@/types'
import { useToDoStore } from '@/store/toDoStore'
import { useSimpleTimer } from '@/hooks/useSimpleTimer'
import AnimatedBorder from './AnimatedBorder'
import { AnimatedBars } from './AnimatedBars'
import ChecklistSection from './ChecklistSection'
import { MusicPlayer } from './MusicPlayer'

interface SortableTaskItemProps {
  task: Task
  taskIndex: number
  onDelete: (id: string) => void
  onToggleCompletion: (id: string) => void
  groupPosition?: 'single' | 'first' | 'middle' | 'last'
}

export default function SortableTaskItem({
  task,
  taskIndex,
  onDelete,
  onToggleCompletion,
  groupPosition = 'single'
}: SortableTaskItemProps) {
  const [editDescription, setEditDescription] = useState(task.description)
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState(task.estimatedMinutes)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isOptionsDropdownOpen, setIsOptionsDropdownOpen] = useState(false)
  const [showMoveToSubmenu, setShowMoveToSubmenu] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
  const customTimeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isEditingActualTime, setIsEditingActualTime] = useState(false)
  const [editActualMinutes, setEditActualMinutes] = useState('')
  const actualTimeInputRef = useRef<HTMLInputElement>(null)
  const [, setShowEditButtons] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [isScratching, setIsScratching] = useState(false)
  const [showStrikethrough, setShowStrikethrough] = useState(false)
  const [showCheckmarkAnimation, setShowCheckmarkAnimation] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)


  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const optionsDropdownRef = useRef<HTMLDivElement>(null)
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
  const loadChecklistItems = useToDoStore((state) => state.loadChecklistItems)
  const lists = useToDoStore((state) => state.lists)
  const moveTaskToList = useToDoStore((state) => state.moveTaskToList)
  const currentListId = useToDoStore((state) => state.currentListId)
  const toggleTaskMusic = useToDoStore((state) => state.toggleTaskMusic)
  const generateMusicForTask = useToDoStore((state) => state.generateMusicForTask)
  const retryMusicGeneration = useToDoStore((state) => state.retryMusicGeneration)
  
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

  // Show checklist if task has checklist items
  useEffect(() => {
    if (task.checklistItems && task.checklistItems.length > 0) {
      setShowChecklist(true)
    }
  }, [task.checklistItems])

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

  // Handle click outside options dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (optionsDropdownRef.current && !optionsDropdownRef.current.contains(event.target as Node)) {
        setIsOptionsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Focus input when editing actual time starts
  useEffect(() => {
    if (isEditingActualTime && actualTimeInputRef.current) {
      actualTimeInputRef.current.focus()
      actualTimeInputRef.current.select()
    }
  }, [isEditingActualTime])

  // Handle click outside to do card to save edits
  useEffect(() => {
    function handleClickOutsideTaskCard(event: MouseEvent) {
      if (isEditing && taskCardRef.current && !taskCardRef.current.contains(event.target as Node)) {
        // Save the current edits when clicking outside
        const saveAndClose = async () => {
          try {
            if (editDescription.trim()) {
              await updateTaskDescription(task.id, editDescription.trim())
              await updateTaskEstimatedTime(task.id, editEstimatedMinutes)
            }
            setIsAnimatingOut(true)
            setTimeout(() => {
              clearEditingTask()
              setShowEditButtons(false)
              setIsAnimatingOut(false)
            }, 150)
          } catch (error) {
            console.error('Failed to save task on click outside:', error)
          }
        }
        saveAndClose()
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
      const autoSave = async () => {
        try {
          if (editDescription.trim()) {
            await updateTaskDescription(task.id, editDescription.trim())
            await updateTaskEstimatedTime(task.id, editEstimatedMinutes)
          }
          setIsAnimatingOut(true)
          setTimeout(() => {
            setShowEditButtons(false)
            setIsAnimatingOut(false)
          }, 150)
        } catch (error) {
          console.error('Failed to auto-save task:', error)
        }
      }
      autoSave()
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

    // Generate music if enabled and not already generated
    if (task.musicEnabled && !task.musicUrl && task.musicGenerationStatus !== 'generating') {
      generateMusicForTask(task.id)
    }
  }

  const handlePauseTask = () => {
    pause() // Actually pause the timer
    stopTask() // Stop tracking active task
  }


  const handleToggleCompletion = () => {
    const isCompleting = !task.isCompleted

    // If completing the task, trigger cat paw animation
    if (isCompleting) {
      // 90% chance for cat paw scratch
      const showScratch = Math.random() < 0.9

      // Trigger checkmark animation
      setShowCheckmarkAnimation(true)

      if (showScratch) {
        // Start the scratch animation
        setIsScratching(true)
      }

      // If completing the task while timer is active, stop and clear it completely FIRST
      // This must happen before saving actual time to ensure timer is stopped immediately
      if (isRunning) {
        pause() // Pause first to capture current time
      }

      // If completing the to do and we have timer data, save the actual time
      if (hasStarted && seconds > 0) {
        const actualMinutes = Math.round(seconds / 60) || 1 // At least 1 minute
        updateTaskActualTime(task.id, actualMinutes)
      }

      // Clear the timer completely (removes from localStorage)
      if (hasStarted) {
        stop() // Clear the timer completely (removes from localStorage)
      }

      // If completing while active, stop task tracking
      if (isActive) {
        stopTask()
      }

      if (showScratch) {
        // Show strikethrough mid-animation (when paw is scratching)
        setTimeout(() => {
          setShowStrikethrough(true)
        }, 500)

        // Hide the paw after animation completes
        setTimeout(() => {
          setIsScratching(false)
        }, 1500)

        // Complete the task after showing strikethrough for a bit longer
        setTimeout(() => {
          setShowStrikethrough(false)
          setShowCheckmarkAnimation(false)
          onToggleCompletion(task.id)
        }, 2500)
      } else {
        // No scratch animation - show checkmark briefly before completing
        setTimeout(() => {
          setShowCheckmarkAnimation(false)
          onToggleCompletion(task.id)
        }, 800)
      }
    } else {
      // If uncompleting, do it immediately
      onToggleCompletion(task.id)
    }
  }

  const handleEdit = () => {
    // Allow editing both completed and incomplete todos

    // If another to do is being edited, we need to save its current values
    // This will be handled by the component that's currently being edited
    // when it detects the editingTaskId change

    // Reset any animation states to prevent flashing
    setIsScratching(false)
    setShowStrikethrough(false)
    setShowCheckmarkAnimation(false)

    setEditingTask(task.id)
    setShowEditButtons(true)
  }

  const handleSave = async () => {
    try {
      if (editDescription.trim()) {
        await updateTaskDescription(task.id, editDescription.trim())
        await updateTaskEstimatedTime(task.id, editEstimatedMinutes)
      }
      setIsAnimatingOut(true)
      setTimeout(() => {
        clearEditingTask()
        setShowEditButtons(false)
        setIsAnimatingOut(false)
      }, 150)
    } catch (error) {
      console.error('Failed to save task:', error)
    }
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

  const handleActualTimeClick = () => {
    const currentMinutes = task.actualMinutes || task.estimatedMinutes
    setEditActualMinutes(currentMinutes.toString())
    setIsEditingActualTime(true)
  }

  const handleActualTimeSave = () => {
    const minutes = parseInt(editActualMinutes)
    if (minutes > 0) {
      updateTaskActualTime(task.id, minutes)
    }
    setIsEditingActualTime(false)
    setEditActualMinutes('')
  }

  const handleActualTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleActualTimeSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsEditingActualTime(false)
      setEditActualMinutes('')
    }
  }

  const handleAddChecklist = async () => {
    setIsOptionsDropdownOpen(false)

    // If checklist items haven't been loaded yet, load them
    if (!task.checklistItems) {
      await loadChecklistItems(task.id)
    }

    // Show the checklist section
    setShowChecklist(true)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease-out',
    willChange: isDragging ? 'transform' : 'auto',
    opacity: isDragging ? 0.1 : 1,
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
    <AnimatedBorder>
      <div className="relative w-full group max-w-[520px]">
        {/* Drag Handle - Positioned absolutely to not affect card width, hidden on mobile */}
        <button
          className="hidden lg:block absolute -left-10 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 z-10 hover:bg-[var(--muted)]"
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
          className={`w-full shadow-[2px_2px_4px_rgba(0,0,0,0.15)] group ${isEditing ? 'overflow-visible' : 'overflow-hidden'} ${isActive ? 'ring-2' : ''} ${
            isEditing
              ? 'p-6 md:p-6'
              : task.createdByName && task.createdByUserId && task.userId !== task.createdByUserId
                ? 'p-6 md:p-6 pb-10 md:pb-12'
                : 'p-6 md:p-6'
          } ${
            groupPosition === 'single' ? 'rounded-[20px]' :
            groupPosition === 'first' ? 'rounded-t-[20px]' :
            groupPosition === 'last' ? 'rounded-b-[20px]' :
            ''
          } ${!isEditing && !task.isCompleted ? 'lg:cursor-default touch-manipulation hover:shadow-[4px_4px_8px_rgba(0,0,0,0.2)] transition-shadow duration-200' : ''}`}
          style={{
            ...style,
            backgroundColor: 'var(--color-todoloo-card)'
          }}
          onMouseEnter={() => setShowEditButtons(true)}
          onMouseLeave={() => !isEditing && setShowEditButtons(false)}
          {...(!isEditing && !task.isCompleted ? { ...attributes, ...listeners } : {})}
        >
          {isEditing ? (
            // Edit mode - looks like TaskCard
            <div className={`flex flex-col ${showChecklist ? 'gap-2' : 'gap-8'} transition-all duration-150 ${
              isAnimatingOut
                ? 'animate-out fade-out-0'
                : 'animate-in fade-in-0'
            }`}>
              <div className="flex items-start pr-12">
                <textarea
                  ref={descriptionInputRef}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write something that will disappoint your future self"
                  rows={1}
                  className="flex-1 text-base font-['Outfit'] bg-transparent border-none outline-none resize-none overflow-hidden"
                  style={{
                    color: 'var(--color-todoloo-text-primary)'
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = target.scrollHeight + 'px'
                  }}
                />
              </div>

              {/* Checklist Section - shown in edit mode */}
              {showChecklist && (
                <ChecklistSection taskId={task.id} checklistItems={task.checklistItems} isEditing={isEditing} />
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
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
                      <span className="text-xs font-['Outfit']" style={{ color: 'var(--color-todoloo-text-secondary)', transform: 'translateY(1px)' }}>
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
                              className="w-full text-left px-3 py-2 text-xs text-[#696969] font-['Outfit'] hover:bg-[#F5F5F5] rounded-[10px] transition-colors cursor-pointer"
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
                                className="flex-1 text-xs text-[#2D1B1B] font-['Outfit'] bg-transparent border-none outline-none placeholder:text-[#989999]"
                              />
                              <span className="text-xs text-[#696969] font-['Outfit']">minutes</span>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ellipsis Options Menu */}
                  <div className="relative" ref={optionsDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsOptionsDropdownOpen(!isOptionsDropdownOpen)}
                      className="h-8 w-8 rounded-[20px] border flex items-center justify-center transition-colors cursor-pointer"
                      style={{
                        borderColor: 'var(--color-todoloo-border)',
                        backgroundColor: isOptionsDropdownOpen ? 'var(--color-todoloo-muted)' : 'var(--color-todoloo-card)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isOptionsDropdownOpen) {
                          e.currentTarget.style.backgroundColor = 'var(--color-todoloo-muted)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isOptionsDropdownOpen) {
                          e.currentTarget.style.backgroundColor = 'var(--color-todoloo-card)'
                        }
                      }}
                      aria-label="More options"
                    >
                      <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
                    </button>

                    {isOptionsDropdownOpen && (
                      <div className="absolute top-9 left-0 w-48 bg-[#FEFFFF] rounded-[20px] border border-[#D9D9D9] shadow-[0px_4px_54px_rgba(0,0,0,0.05)] p-2 z-10">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (showChecklist) {
                                setShowChecklist(false)
                              } else {
                                handleAddChecklist()
                              }
                              setIsOptionsDropdownOpen(false)
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-[#696969] font-['Outfit'] hover:bg-[#F5F5F5] rounded-[10px] transition-colors cursor-pointer"
                          >
                            {showChecklist ? 'Hide Checklist' : 'Add Checklist'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              toggleTaskMusic(task.id)
                              setIsOptionsDropdownOpen(false)
                            }}
                            className="w-full text-left px-3 py-2 text-xs text-[#696969] font-['Outfit'] hover:bg-[#F5F5F5] rounded-[10px] transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <Music className="w-3 h-3" />
                            {task.musicEnabled ? 'Disable Music' : 'Enable Music'}
                          </button>

                          {lists.length > 1 && (
                            <div className="relative">
                              <button
                                type="button"
                                onMouseEnter={() => setShowMoveToSubmenu(true)}
                                onMouseLeave={() => setShowMoveToSubmenu(false)}
                                className="w-full text-left px-3 py-2 text-xs text-[#696969] font-['Outfit'] hover:bg-[#F5F5F5] rounded-[10px] transition-colors cursor-pointer flex items-center justify-between"
                              >
                                Move to...
                                <ChevronDown className="w-3 h-3 -rotate-90" />
                              </button>

                              {showMoveToSubmenu && (
                                <div
                                  className="absolute left-full top-0 ml-1 w-40 bg-[#FEFFFF] rounded-[20px] border border-[#D9D9D9] shadow-[0px_4px_54px_rgba(0,0,0,0.05)] p-2 z-20"
                                  onMouseEnter={() => setShowMoveToSubmenu(true)}
                                  onMouseLeave={() => setShowMoveToSubmenu(false)}
                                >
                                  {lists
                                    .filter(list => list.id !== currentListId)
                                    .map(list => (
                                      <button
                                        key={list.id}
                                        type="button"
                                        onClick={async () => {
                                          await moveTaskToList(task.id, list.id)
                                          setIsOptionsDropdownOpen(false)
                                          setShowMoveToSubmenu(false)
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs text-[#696969] font-['Outfit'] hover:bg-[#F5F5F5] rounded-[10px] transition-colors cursor-pointer"
                                      >
                                        {list.name}
                                      </button>
                                    ))
                                  }
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onDelete(task.id)}
                    className="text-sm font-['Outfit'] cursor-pointer transition-colors"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--color-todoloo-text-secondary)',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-todoloo-text-primary)'
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
                    className="h-8 px-4 rounded-full hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(to right, var(--color-todoloo-gradient-start), var(--color-todoloo-gradient-end))',
                      border: 'none'
                    }}
                  >
                    <span className="text-white text-sm font-medium" style={{ fontFamily: 'Outfit' }}>Save</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Normal display mode - simplified design with hover states
            <>
            <div className={`flex items-center relative ${isActive ? 'active' : ''}`}>
              {/* Cat Paw Scratch Animation - covers entire card */}
              {isScratching && (
                <div
                  className="absolute h-full flex items-center pointer-events-none z-20"
                  style={{
                    top: '12px',
                    left: 0,
                    animation: 'catPawSlide 1.5s ease-in-out',
                    animationFillMode: 'backwards',
                    transform: 'translateX(-100%)',
                  }}
                >
                  <Image
                    src="/catpaw.png"
                    alt="cat paw"
                    width={288}
                    height={200}
                    className="w-72 h-auto"
                    style={{
                      animation: 'catPawScratch 0.6s ease-in-out 0.3s'
                    }}
                  />
                </div>
              )}

              {/* Task number or play/animated bars */}
              <div className="hidden lg:flex items-center justify-center w-[32px] mr-6">
                {isRunning && hasStarted ? (
                  // Active task: show animated bars that fade to pause on hover
                  <div className="relative w-10 h-10 md:w-8 md:h-8 flex items-center justify-center">
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
                      style={{ color: '#989999', fontSize: 28, fontFamily: 'Outfit' }}
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
                    <p className={`text-sm md:text-base font-medium ${
                      task.isCompleted || showStrikethrough ? 'line-through' : ''
                    }`}
                       style={{
                         color: task.isCompleted ? 'var(--color-todoloo-text-muted)' : 'var(--color-todoloo-text-secondary)',
                         fontFamily: 'Outfit'
                       }}>
                      {task.description}
                    </p>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center relative">
                        {task.isCompleted ? (
                          isEditingActualTime ? (
                            <div className="flex items-center gap-1">
                              <input
                                ref={actualTimeInputRef}
                                type="number"
                                value={editActualMinutes}
                                onChange={(e) => setEditActualMinutes(e.target.value)}
                                onKeyDown={handleActualTimeKeyDown}
                                onBlur={handleActualTimeSave}
                                min="1"
                                max="999"
                                className="w-16 text-sm bg-transparent border-b border-[var(--color-todoloo-text-muted)] outline-none"
                                style={{ color: 'var(--color-todoloo-text-muted)', fontFamily: 'Outfit', fontWeight: 400 }}
                              />
                              <span className="text-sm" style={{ color: 'var(--color-todoloo-text-muted)', fontFamily: 'Outfit', fontWeight: 400 }}>
                                minutes
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={handleActualTimeClick}
                              className="text-sm cursor-pointer hover:underline"
                              style={{ color: 'var(--color-todoloo-text-muted)', fontFamily: 'Outfit', fontWeight: 400 }}
                            >
                              {task.actualMinutes
                                ? formatEstimatedTime(task.actualMinutes)
                                : formatEstimatedTime(task.estimatedMinutes)
                              }
                            </button>
                          )
                        ) : (
                          <p className="text-sm" style={{ color: 'var(--color-todoloo-text-muted)', fontFamily: 'Outfit', fontWeight: 400 }}>
                            {formatEstimatedTime(task.estimatedMinutes)}
                          </p>
                        )}
                        {hasStarted && !task.isCompleted && (
                          <>
                            <span className="text-sm mx-2" style={{ color: 'var(--color-todoloo-text-secondary)', fontFamily: 'Outfit', fontWeight: 400 }}>•</span>
                            <p className="text-sm"
                               style={{
                                 color: isActive ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-text-secondary)',
                                 fontFamily: 'Outfit',
                                 fontWeight: 400
                               }}>
                              {formatTime(seconds)}
                            </p>
                          </>
                        )}
                      </div>
                      {task.musicEnabled && !task.isCompleted && (
                        <MusicPlayer
                          taskId={task.id}
                          musicUrl={task.musicUrl}
                          musicGenerationStatus={task.musicGenerationStatus}
                          isTaskActive={isActive}
                          isTaskPaused={!isRunning && hasStarted}
                          onRetry={() => retryMusicGeneration(task.id)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox - always visible */}
              <div className="flex items-center justify-center relative min-w-[56px]" style={{ width: 56, height: 56 }}>
                <button
                  onClick={handleToggleCompletion}
                  className={`w-10 h-10 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center cursor-pointer relative ${
                    !task.isCompleted && !isScratching ? 'hover:scale-90 transition-transform duration-150 ease-out' : ''
                  } ${
                    task.isCompleted || isScratching
                      ? ''
                      : 'bg-[#F9F9FD] dark:bg-[#2a2a2a] border-[#E8E6E6] dark:border-[#404040]'
                  }`}
                  style={{
                    backgroundColor: (task.isCompleted || isScratching || showCheckmarkAnimation) ? 'var(--color-todoloo-gradient-start)' : undefined,
                    borderColor: (task.isCompleted || isScratching || showCheckmarkAnimation) ? 'var(--color-todoloo-gradient-start)' : undefined,
                    color: (task.isCompleted || isScratching || showCheckmarkAnimation) ? 'white' : 'var(--color-todoloo-text-primary)',
                    animation: showCheckmarkAnimation ? 'checkmarkRotate 0.5s ease-out 0.3s' : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!task.isCompleted && !isScratching) {
                      e.currentTarget.style.borderColor = 'var(--color-todoloo-gradient-start)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!task.isCompleted && !isScratching) {
                      e.currentTarget.style.borderColor = ''
                      e.currentTarget.classList.add('border-[#E8E6E6]', 'dark:border-[#404040]')
                    }
                  }}
                >
                  {/* Progress pie chart for checklist items */}
                  {!task.isCompleted && !isScratching && !showCheckmarkAnimation && task.checklistItems && task.checklistItems.length > 0 && (() => {
                    const completed = task.checklistItems.filter(item => item.isCompleted).length
                    const total = task.checklistItems.length
                    const percentage = (completed / total) * 100
                    const radius = 14 // for w-8 h-8 (32px)
                    const circumference = 2 * Math.PI * radius
                    const offset = circumference - (percentage / 100) * circumference

                    return (
                      <svg className="absolute inset-0 w-full h-full -rotate-90" style={{ overflow: 'visible' }}>
                        <circle
                          cx="50%"
                          cy="50%"
                          r={radius}
                          fill="none"
                          stroke="var(--color-todoloo-gradient-start)"
                          strokeWidth="2"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                        />
                      </svg>
                    )
                  })()}

                  {(task.isCompleted || isScratching || showCheckmarkAnimation) && (
                    <>
                      <Check
                        className="w-4 h-4"
                        style={{
                          animation: showCheckmarkAnimation ? 'checkmarkBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)' : undefined
                        }}
                      />
                      {showCheckmarkAnimation && (
                        <>
                          <span className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'var(--color-todoloo-gradient-start)', animation: 'rippleExpand 0.6s ease-out' }} />
                          <span className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'var(--color-todoloo-gradient-start)', animation: 'rippleExpand 0.8s ease-out 0.1s' }} />
                          <span className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'var(--color-todoloo-gradient-start)', animation: 'rippleExpand 1s ease-out 0.2s' }} />
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Checklist Section - only shown in normal mode */}
            {showChecklist && (
              <ChecklistSection taskId={task.id} checklistItems={task.checklistItems} isEditing={isEditing} />
            )}
            </>
          )}

          {/* Creator attribution - positioned absolutely at bottom right */}
          {task.createdByName && task.createdByUserId && task.userId !== task.createdByUserId && (
            <div className="absolute bottom-3 right-4">
              <p className="text-xs font-normal" style={{ color: 'var(--color-todoloo-text-muted)', fontFamily: 'Outfit' }}>
                With love from {task.createdByName}
              </p>
            </div>
          )}

        </div>
      </div>
    </AnimatedBorder>
  )
}
