'use client'

import { useState, useRef, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Check, GripVertical, Timer, ChevronDown, Plus, Play, Square } from 'lucide-react'
import { Task } from '@/types'
import { useTaskStore } from '@/store/taskStore'
import { useSimpleTimer } from '@/hooks/useSimpleTimer'
import AnimatedBorder from './AnimatedBorder'

interface SortableTaskItemProps {
  task: Task
  onDelete: (id: string) => void
  onToggleCompletion: (id: string) => void
  isTaskActive: boolean
}

export default function SortableTaskItem({ 
  task, 
  onDelete, 
  onToggleCompletion, 
  isTaskActive 
}: SortableTaskItemProps) {
  const [editDescription, setEditDescription] = useState(task.description)
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState(task.estimatedMinutes)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
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
  
  const updateTaskDescription = useTaskStore((state) => state.updateTaskDescription)
  const updateTaskEstimatedTime = useTaskStore((state) => state.updateTaskEstimatedTime)
  const updateTaskActualTime = useTaskStore((state) => state.updateTaskActualTime)
  const editingTaskId = useTaskStore((state) => state.editingTaskId)
  const setEditingTask = useTaskStore((state) => state.setEditingTask)
  const clearEditingTask = useTaskStore((state) => state.clearEditingTask)
  const startTask = useTaskStore((state) => state.startTask)
  const stopTask = useTaskStore((state) => state.stopTask)
  const activeTaskId = useTaskStore((state) => state.activeTaskId)
  
  const isEditing = editingTaskId === task.id
  const isActive = activeTaskId === task.id
  const { seconds, isRunning, hasStarted, start, pause, stop, formatTime } = useSimpleTimer()
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  // Update local state when task changes
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
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Handle click outside task card to save edits
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

  // Handle when editing task changes - auto-save if we were editing
  useEffect(() => {
    if (isEditing && editingTaskId !== task.id) {
      // We were editing this task but now another task is being edited
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

  // Handle timer start/pause when task becomes active/inactive
  useEffect(() => {
    if (isActive) {
      start()
    } else if (hasStarted) {
      pause()
    }
  }, [isActive, start, pause, hasStarted])

  const handleStartTask = () => {
    startTask(task.id)
  }

  const handleStopTask = () => {
    stopTask()
    stop() // Reset the timer
  }

  const handleToggleCompletion = () => {
    // If completing the task and we have timer data, save the actual time
    if (!task.isCompleted && hasStarted && seconds > 0) {
      const actualMinutes = Math.round(seconds / 60) || 1 // At least 1 minute
      updateTaskActualTime(task.id, actualMinutes)
    }
    onToggleCompletion(task.id)
  }


  const handleEdit = () => {
    if (task.isCompleted) return
    
    // If another task is being edited, we need to save its current values
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
  }

  const handleCustomTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const minutes = parseInt(customMinutes)
    if (minutes > 0) {
      setEditEstimatedMinutes(minutes)
      setCustomMinutes('')
      setIsDropdownOpen(false)
    }
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
      <div
        ref={(node) => {
          setNodeRef(node)
          taskCardRef.current = node
        }}
        style={style}
        className={`w-[600px] bg-[#FEFFFF] rounded-[20px] border border-[#D9D9D9] group ${
          isDragging ? 'opacity-50 shadow-xl z-50' : 'transition-opacity duration-200'
        } ${isActive ? 'ring-2 ring-[#9F8685]' : ''} ${isEditing ? 'pt-4 pb-4 pl-4 pr-6' : 'pt-4 pb-4 pl-4 pr-6'}`}
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
              className="flex-1 text-base text-[#2D1B1B] font-inter placeholder:text-[#989999] bg-transparent border-none outline-none"
            />
          </div>
          
          <div className="flex justify-between items-end">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`h-8 px-3 rounded-[20px] border border-[#E6E6E6] flex items-center gap-1 transition-colors ${
                  isDropdownOpen 
                    ? 'bg-[#F0F0F0] border-[#D0D0D0]' 
                    : 'bg-white hover:bg-[#FAFAFA]'
                }`}
              >
                <Timer className="w-3.5 h-3.5 text-[#696969]" />
                <span className="text-xs text-[#696969] font-inter" style={{ transform: 'translateY(1px)' }}>
                  {editEstimatedMinutes < 60 ? `${editEstimatedMinutes} minutes` : `${Math.floor(editEstimatedMinutes / 60)} hours ${editEstimatedMinutes % 60}m`}
                </span>
                <ChevronDown className={`w-3 h-3 text-[#696969] transition-transform translate-y-px ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute top-9 left-0 w-48 bg-[#FEFFFF] rounded-[20px] border border-[#D9D9D9] shadow-[0px_4px_54px_rgba(0,0,0,0.05)] p-2 z-10">
                  <div className="space-y-1">
                    {commonTimes.map((time) => (
                      <button
                        key={time.value}
                        type="button"
                        onClick={() => handleTimeSelect(time.value)}
                        className="w-full text-left px-3 py-2 text-xs text-[#696969] font-inter hover:bg-[#F5F5F5] rounded-[10px] transition-colors"
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
                          onChange={(e) => setCustomMinutes(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleCustomTimeSubmit(e)
                            }
                          }}
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
            
            <button
              onClick={handleSave}
              className="p-1.5 bg-gradient-to-r from-[#9F8685] to-[#583636] rounded-[10px] hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      ) : (
        // Normal display mode - simplified design with hover states
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={handleToggleCompletion}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                task.isCompleted
                  ? 'bg-[#9F8685] border-[#9F8685] text-white'
                  : 'border-[#D9D9D9] hover:border-[#9F8685]'
              }`}
            >
              {task.isCompleted && <Check className="w-3 h-3" />}
            </button>
            
            <div className="flex-1">
              <div 
                className="group/description cursor-text"
                onClick={handleEdit}
              >
                <p className={`text-base font-inter ${
                  task.isCompleted ? 'text-[#989999] line-through' : 'text-[#2D1B1B]'
                }`}>
                  {task.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-[#696969] font-inter">
                    {task.isCompleted && task.actualMinutes 
                      ? formatEstimatedTime(task.actualMinutes)
                      : formatEstimatedTime(task.estimatedMinutes)
                    }
                  </p>
                  {hasStarted && (
                    <p className={`text-sm font-inter font-medium ${
                      isActive ? 'text-[#9F8685]' : 'text-[#696969]'
                    }`}>
                      • {formatTime(seconds)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hover action buttons */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => onDelete(task.id)}
              className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-all duration-200 text-[#696969] hover:text-red-500 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            <button
              className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing text-[#696969]"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </button>
            
            {!task.isCompleted && (
              <button
                onClick={isActive ? handleStopTask : handleStartTask}
                className={`p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                    : 'bg-green-100 hover:bg-green-200 text-green-600'
                }`}
              >
                {isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      )}
      </div>
    </AnimatedBorder>
  )
}
