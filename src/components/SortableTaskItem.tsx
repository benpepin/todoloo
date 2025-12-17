'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { Check, GripVertical, Play, Pause, Music, Timer, ListChecks } from 'lucide-react'
import { Task } from '@/types'
import { useToDoStore } from '@/store/toDoStore'
import { useSimpleTimer } from '@/hooks/useSimpleTimer'
import AnimatedBorder from './AnimatedBorder'
import { AnimatedBars } from './AnimatedBars'
import UnifiedChecklistSection from './shared/UnifiedChecklistSection'
import TimeDropdown from './shared/TimeDropdown'
import OptionsMenu from './shared/OptionsMenu'
import { formatEstimatedTime } from '@/utils/timeFormatting'
import { MusicPlayer } from './MusicPlayer'

interface SortableTaskItemProps {
  task: Task
  taskIndex: number
  onDelete: (id: string) => void
  onToggleCompletion: (id: string) => void
  groupPosition?: 'single' | 'first' | 'middle' | 'last'
  isNewlyCreated?: boolean
}

export default function SortableTaskItem({
  task,
  taskIndex,
  onDelete,
  onToggleCompletion,
  groupPosition = 'single',
  isNewlyCreated = false
}: SortableTaskItemProps) {
  const [editDescription, setEditDescription] = useState(task.description)
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState(task.estimatedMinutes)
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
  const taskCardRef = useRef<HTMLDivElement>(null)
  
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

  // Show checklist if task has checklist items, hide if all items deleted
  useEffect(() => {
    if (task.checklistItems && task.checklistItems.length > 0) {
      setShowChecklist(true)
    } else if (task.checklistItems && task.checklistItems.length === 0 && showChecklist) {
      // All items deleted - hide the checklist section
      setShowChecklist(false)
    }
  }, [task.checklistItems, showChecklist])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && descriptionInputRef.current) {
      descriptionInputRef.current.focus()
      descriptionInputRef.current.select()
    }
  }, [isEditing])

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const handleActualTimeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
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
    console.log('[SortableTaskItem] handleAddChecklist called', {
      taskId: task.id,
      hasChecklistItems: !!task.checklistItems,
      checklistItemsLength: task.checklistItems?.length || 0,
      timestamp: new Date().toISOString()
    })
    // If checklist items haven't been loaded yet, load them
    if (!task.checklistItems) {
      console.log('[SortableTaskItem] handleAddChecklist - loading checklist items')
      await loadChecklistItems(task.id)
      console.log('[SortableTaskItem] handleAddChecklist - checklist items loaded', {
        itemsLength: task.checklistItems?.length || 0
      })
    }

    // Create first empty item if no items exist
    const itemsLength = task.checklistItems?.length || 0
    if (itemsLength === 0) {
      console.log('[SortableTaskItem] handleAddChecklist - creating first empty item')
      await useToDoStore.getState().addChecklistItem(task.id, '')
    }

    // Show the checklist section
    console.log('[SortableTaskItem] handleAddChecklist - showing checklist')
    setShowChecklist(true)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease-out',
    willChange: isDragging ? 'transform' : 'auto',
    opacity: isDragging ? 0.1 : 1,
  }

  return (
    <AnimatedBorder>
      <motion.div
        className="relative w-full group max-w-[520px]"
        layout
        layoutId={`task-${task.id}`}
        initial={isNewlyCreated ? { opacity: 0, y: 20, scale: 0.98 } : { opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{
          layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          opacity: { duration: 0.25 },
          y: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          scale: { duration: 0.25 }
        }}
      >
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
              ? 'p-5 max-[400px]:p-5 md:p-6'
              : task.createdByName && task.createdByUserId && task.userId !== task.createdByUserId
                ? 'p-5 max-[400px]:p-5 md:p-6 pb-10 md:pb-12'
                : 'p-5 max-[400px]:p-5 md:p-6'
          } ${
            groupPosition === 'single' ? 'rounded-[20px]' :
            groupPosition === 'first' ? 'rounded-t-[20px]' :
            groupPosition === 'last' ? 'rounded-b-[20px]' :
            ''
          } ${!isEditing && !task.isCompleted ? 'lg:cursor-default touch-manipulation hover:shadow-[4px_4px_8px_rgba(0,0,0,0.2)] transition-shadow duration-200' : ''}`}
          style={{
            ...style,
            backgroundColor: 'var(--color-todoloo-task)'
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
                <UnifiedChecklistSection
                  items={task.checklistItems || []}
                  onAddItem={(description) => useToDoStore.getState().addChecklistItem(task.id, description)}
                  onDeleteItem={(id) => useToDoStore.getState().deleteChecklistItem(id)}
                  onToggleItem={(id) => useToDoStore.getState().toggleChecklistItemCompletion(id)}
                  onUpdateItem={(id, description) => useToDoStore.getState().updateChecklistItemField(id, { description })}
                  onReorderItems={(items) => useToDoStore.getState().updateChecklistItemOrder(task.id, items)}
                  isEditing={isEditing}
                  compact={false}
                />
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {/* Timer Dropdown */}
                  <TimeDropdown
                    value={editEstimatedMinutes}
                    onChange={(minutes) => {
                      setEditEstimatedMinutes(minutes)
                      updateTaskEstimatedTime(task.id, minutes)
                    }}
                  />

                  {/* Ellipsis Options Menu */}
                  <OptionsMenu
                    items={[
                      {
                        label: (showChecklist && task.checklistItems && task.checklistItems.length > 0) ? 'Hide Checklist' : 'Add Checklist',
                        onClick: () => {
                          if (showChecklist && task.checklistItems && task.checklistItems.length > 0) {
                            setShowChecklist(false)
                          } else {
                            handleAddChecklist()
                          }
                        },
                        icon: <ListChecks className="w-3 h-3" />
                      },
                      {
                        label: task.musicEnabled ? 'Disable Music' : 'Enable Music',
                        onClick: () => toggleTaskMusic(task.id),
                        icon: <Music className="w-3 h-3" />
                      },
                      ...(lists.length > 1 ? [{
                        label: 'Move to...',
                        items: lists
                          .filter(list => list.id !== currentListId)
                          .map(list => ({
                            label: list.name,
                            onClick: async () => await moveTaskToList(task.id, list.id)
                          }))
                      }] : [])
                    ]}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onDelete(task.id)}
                    className="text-xs font-['Outfit'] cursor-pointer transition-colors"
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
                    <span className="text-white text-xs font-medium" style={{ fontFamily: 'Outfit' }}>Save</span>
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
              <div className="flex items-center justify-center relative w-[24px] lg:w-[56px]" style={{ height: 56 }}>
                <button
                  onClick={handleToggleCompletion}
                  className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 flex items-center justify-center cursor-pointer relative ${
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
                    const radius = window.innerWidth >= 1024 ? 14 : 10 // for lg:w-8 lg:h-8 (32px) or w-6 h-6 (24px)
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
                        className="w-3 h-3 lg:w-4 lg:h-4"
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
              <UnifiedChecklistSection
                items={task.checklistItems || []}
                onAddItem={(description) => useToDoStore.getState().addChecklistItem(task.id, description)}
                onDeleteItem={(id) => useToDoStore.getState().deleteChecklistItem(id)}
                onToggleItem={(id) => useToDoStore.getState().toggleChecklistItemCompletion(id)}
                onUpdateItem={(id, description) => useToDoStore.getState().updateChecklistItemField(id, { description })}
                onReorderItems={(items) => useToDoStore.getState().updateChecklistItemOrder(task.id, items)}
                isEditing={false}
                compact={false}
              />
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
      </motion.div>
    </AnimatedBorder>
  )
}
