'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Timer, ChevronDown, CornerDownLeft, MoreHorizontal, Check, X, GripVertical } from 'lucide-react'
import { useToDoStore } from '@/store/toDoStore'
import { useHistoryStore } from '@/store/historyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { estimateTimeFromDescription } from '@/utils/timeEstimation'
import type { ChecklistItem } from '@/types'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Rotating placeholder text component
function RotatingPlaceholder({
  texts,
  interval = 2000,
  className = "",
  onTextChange
}: {
  texts: string[],
  interval?: number,
  className?: string,
  onTextChange?: (text: string) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        const newIndex = (currentIndex + 1) % texts.length
        setCurrentIndex(newIndex)
        setIsVisible(true)
        // Trigger time estimation when placeholder text changes
        if (onTextChange) {
          onTextChange(texts[newIndex])
        }
      }, 300) // Half of the transition duration
    }, interval)

    return () => clearInterval(timer)
  }, [texts.length, interval, currentIndex, texts, onTextChange])

  return (
    <span
      className={`transition-opacity duration-500 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {texts[currentIndex]}
    </span>
  )
}

// Temporary Checklist component for new todos (before they're created)
interface TempChecklistSectionProps {
  items: ChecklistItem[]
  onAddItem: (description: string) => void
  onDeleteItem: (id: string) => void
  onToggleItem: (id: string) => void
  onUpdateItem: (id: string, description: string) => void
  onReorder: (reorderedItems: ChecklistItem[]) => void
}

interface SortableTempChecklistItemProps {
  item: ChecklistItem
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, description: string) => void
}

function SortableTempChecklistItem({ item, onToggle, onDelete, onUpdate }: SortableTempChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.description)
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(item.id, editValue.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(item.description)
      setIsEditing(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-[var(--color-todoloo-muted)]"
      tabIndex={-1}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
        tabIndex={0}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--color-todoloo-text-muted)' }} />
      </button>

      <button
        onClick={() => onToggle(item.id)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            onToggle(item.id)
          }
        }}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-150 flex-shrink-0 ${
          !item.isCompleted ? 'hover:scale-90' : ''
        }`}
        style={{
          backgroundColor: item.isCompleted ? 'var(--color-todoloo-gradient-start)' : 'transparent',
          borderColor: item.isCompleted ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-border)',
          color: item.isCompleted ? 'white' : 'transparent'
        }}
      >
        {item.isCompleted && <Check className="w-3 h-3" />}
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 text-sm font-['Outfit'] bg-transparent border-none outline-none"
          style={{ color: 'var(--color-todoloo-text-secondary)' }}
        />
      ) : (
        <span
          className={`flex-1 text-sm font-['Outfit'] cursor-text ${item.isCompleted ? 'line-through' : ''}`}
          style={{
            color: item.isCompleted ? 'var(--color-todoloo-text-muted)' : 'var(--color-todoloo-text-secondary)'
          }}
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          {item.description}
        </span>
      )}

      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded hover:bg-[var(--color-todoloo-border)]"
        aria-label="Delete checklist item"
      >
        <X className="w-3.5 h-3.5" style={{ color: 'var(--color-todoloo-text-muted)' }} />
      </button>
    </div>
  )
}

function TempChecklistSection({ items, onAddItem, onDeleteItem, onToggleItem, onUpdateItem, onReorder }: TempChecklistSectionProps) {
  const [newItemDescription, setNewItemDescription] = useState('')
  const [isAddingItem, setIsAddingItem] = useState(items.length === 0)
  const newItemInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    if (isAddingItem && newItemInputRef.current) {
      newItemInputRef.current.focus()
    }
  }, [isAddingItem])

  const handleAddItem = () => {
    if (!newItemDescription.trim()) {
      setIsAddingItem(false)
      return
    }

    onAddItem(newItemDescription.trim())
    setNewItemDescription('')
    if (newItemInputRef.current) {
      newItemInputRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItem()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setNewItemDescription('')
      setIsAddingItem(false)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      const reorderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        order: index
      }))
      onReorder(reorderedItems)
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {items.map((item) => (
              <SortableTempChecklistItem
                key={item.id}
                item={item}
                onToggle={onToggleItem}
                onDelete={onDeleteItem}
                onUpdate={onUpdateItem}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isAddingItem ? (
        <div className="flex items-center gap-3 py-2 px-3">
          <div className="w-5 h-5 rounded border-2 flex-shrink-0" style={{ borderColor: 'var(--color-todoloo-border)' }} />
          <input
            ref={newItemInputRef}
            type="text"
            value={newItemDescription}
            onChange={(e) => {
              e.stopPropagation() // Prevent space bar from triggering drag
              setNewItemDescription(e.target.value)
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newItemDescription.trim()) {
                setIsAddingItem(false)
              } else {
                handleAddItem()
              }
            }}
            placeholder="Add item..."
            className="flex-1 text-sm font-['Outfit'] bg-transparent border-none outline-none"
            style={{ color: 'var(--color-todoloo-text-primary)' }}
          />
        </div>
      ) : (
        <button
          onClick={() => setIsAddingItem(true)}
          className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:bg-[var(--color-todoloo-muted)] cursor-pointer w-full"
        >
          <Plus className="w-4 h-4" style={{ color: 'var(--color-todoloo-text-muted)' }} />
          <span className="text-sm font-['Outfit']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
            Add item
          </span>
        </button>
      )}
    </div>
  )
}

function ToDoCardContent() {
  const [description, setDescription] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(30)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
  const [multiplicationPreview, setMultiplicationPreview] = useState<{baseDescription: string, count: number} | null>(null)
  const [isOptionsDropdownOpen, setIsOptionsDropdownOpen] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [tempChecklistItems, setTempChecklistItems] = useState<ChecklistItem[]>([])
  const [isTransitioning, setIsTransitioning] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const optionsDropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const addTask = useToDoStore((state) => state.addTask)
  const addChecklistItem = useToDoStore((state) => state.addChecklistItem)
  const setShowCreateTask = useToDoStore((state) => state.setShowCreateTask)
  const getSimilarStats = useHistoryStore((state) => state.getSimilarStats)

  // Get time estimation settings
  const { customKeywords, defaultMinutes } = useSettingsStore()

  const commonTimes = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
  ]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Save custom time if there's a value in the input
        const minutes = parseInt(customMinutes)
        if (minutes > 0) {
          setEstimatedMinutes(minutes)
          setCustomMinutes('')
        }
        setIsDropdownOpen(false)
      }

      if (optionsDropdownRef.current && !optionsDropdownRef.current.contains(event.target as Node)) {
        setIsOptionsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [customMinutes])

  // Auto-focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Handle Escape key to close the new todo form
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Clear any ongoing group when closing
        delete (window as Window & { __currentGroupId?: string }).__currentGroupId
        setShowCreateTask(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setShowCreateTask])

  // Close immediately
  const closeWithAnimation = () => {
    setShowCreateTask(false)
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = e.target.value
    setDescription(newDescription)

    // Check for multiplication pattern (with or without space: "x 3" or "x3")
    const multiplicationMatch = newDescription.trim().match(/^(.+?)\s+x\s*(\d+)$/i)
    if (multiplicationMatch) {
      const [, baseDescription, count] = multiplicationMatch
      const taskCount = parseInt(count, 10)
      if (taskCount > 1 && taskCount <= 10) { // Limit to reasonable number
        setMultiplicationPreview({ baseDescription: baseDescription.trim(), count: taskCount })
        // Use base description for time estimation
        const historicalStats = getSimilarStats(baseDescription.trim())
        const estimatedTime = estimateTimeFromDescription(baseDescription.trim(), customKeywords, defaultMinutes, historicalStats)
        setEstimatedMinutes(estimatedTime)
      } else if (taskCount > 10) {
        setMultiplicationPreview({ baseDescription: baseDescription.trim(), count: taskCount })
        // Still estimate time but show warning
        const historicalStats = getSimilarStats(baseDescription.trim())
        const estimatedTime = estimateTimeFromDescription(baseDescription.trim(), customKeywords, defaultMinutes, historicalStats)
        setEstimatedMinutes(estimatedTime)
      } else {
        setMultiplicationPreview(null)
      }
    } else {
      setMultiplicationPreview(null)

      // Use keyword-based and historical estimation
      if (newDescription.trim()) {
        const historicalStats = getSimilarStats(newDescription)
        const estimatedTime = estimateTimeFromDescription(newDescription, customKeywords, defaultMinutes, historicalStats)
        setEstimatedMinutes(estimatedTime)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim()) {
      console.log('handleSubmit called with:', description)
      // Check for bulk add mode - ends with " and", " AND", or " &"
      const bulkAddMatch = description.match(/^(.+)\s+(and|AND|&)$/i)
      console.log('bulkAddMatch:', bulkAddMatch)

      if (bulkAddMatch) {
        const taskDescription = bulkAddMatch[1].trim()

        if (taskDescription) {
          // Check if we're continuing an existing group or starting a new one
          let groupId = (window as Window & { __currentGroupId?: string }).__currentGroupId

          if (!groupId) {
            // Starting a new group
            groupId = crypto.randomUUID()
            console.log('Creating new group:', groupId)
            ;(window as Window & { __currentGroupId?: string }).__currentGroupId = groupId
          } else {
            console.log('Continuing existing group:', groupId)
          }

          // Check if this is a multiplication pattern before bulk add (with or without space)
          const multiplicationMatch = taskDescription.match(/^(.+?)\s+x\s*(\d+)$/i)

          if (multiplicationMatch) {
            const [, baseDescription, count] = multiplicationMatch
            const taskCount = parseInt(count, 10)

            if (taskCount > 10) {
              alert('Maximum 10 tasks can be created at once. Please use a smaller number.')
              return
            }

            if (taskCount > 1) {
              // Create multiple tasks with the current group ID
              for (let i = 0; i < taskCount; i++) {
                const numberedDescription = `${baseDescription.trim()} (${i + 1})`
                const newTask = await addTask(numberedDescription, estimatedMinutes, groupId)
                // Add checklist items if any
                if (tempChecklistItems.length > 0 && newTask) {
                  for (const item of tempChecklistItems) {
                    await addChecklistItem(newTask.id, item.description)
                  }
                }
              }
            }
          } else {
            // Create single task in the current group
            console.log('Adding task to group:', groupId, taskDescription)
            const newTask = await addTask(taskDescription, estimatedMinutes, groupId)
            // Add checklist items if any
            if (tempChecklistItems.length > 0 && newTask) {
              for (const item of tempChecklistItems) {
                await addChecklistItem(newTask.id, item.description)
              }
            }
          }

          // Reset for next task but keep the card open and group active
          setDescription('')
          setMultiplicationPreview(null)
          setEstimatedMinutes(30)
          setTempChecklistItems([])
          setShowChecklist(false)

          // Re-focus input for next task
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus()
            }
          }, 0)
          return
        }
      } else {
        // Check if we're continuing a group
        const currentGroupId = (window as Window & { __currentGroupId?: string }).__currentGroupId
        console.log('Checking for existing group:', currentGroupId)
        if (currentGroupId) {
          // This task is part of the current group
          console.log('Adding task to group:', currentGroupId, description.trim())
          const newTask = await addTask(description.trim(), estimatedMinutes, currentGroupId)
          // Add checklist items if any
          if (tempChecklistItems.length > 0 && newTask) {
            for (const item of tempChecklistItems) {
              await addChecklistItem(newTask.id, item.description)
            }
          }

          // Clear the group ID since user didn't end with "and"
          // This closes the group - user is done adding to it
          delete (window as Window & { __currentGroupId?: string }).__currentGroupId

          setDescription('')
          setEstimatedMinutes(30)
          setTempChecklistItems([])
          setShowChecklist(false)
          closeWithAnimation() // Close the card with animation since group is complete
          return
        }
      }

      // Close the create card first
      closeWithAnimation()

      // Clear any ongoing group when creating a standalone task
      delete (window as Window & { __currentGroupId?: string }).__currentGroupId
      setDescription('')
      setEstimatedMinutes(30)
      setTempChecklistItems([])
      setShowChecklist(false)

      // Check for multiplication pattern like "walk dog x 3" or "walk dog x3"
      const multiplicationMatch = description.trim().match(/^(.+?)\s+x\s*(\d+)$/i)

      if (multiplicationMatch) {
        const [, baseDescription, count] = multiplicationMatch
        const taskCount = parseInt(count, 10)

        // Limit to reasonable number of to dos
        if (taskCount > 10) {
          alert('Maximum 10 tasks can be created at once. Please use a smaller number.')
          return
        }

        // Create multiple to dos
        for (let i = 0; i < taskCount; i++) {
          const taskDescription = taskCount > 1 ? `${baseDescription.trim()} (${i + 1})` : baseDescription.trim()
          const newTask = await addTask(taskDescription, estimatedMinutes)
          // Add checklist items if any
          if (tempChecklistItems.length > 0 && newTask) {
            for (const item of tempChecklistItems) {
              await addChecklistItem(newTask.id, item.description)
            }
          }
        }
      } else {
        // Single to do (no group)
        const newTask = await addTask(description.trim(), estimatedMinutes)
        // Add checklist items if any
        if (tempChecklistItems.length > 0 && newTask) {
          for (const item of tempChecklistItems) {
            await addChecklistItem(newTask.id, item.description)
          }
        }
      }
    }
  }

  const handleTimeSelect = (minutes: number) => {
    setEstimatedMinutes(minutes)
    setIsDropdownOpen(false)
    // Return focus to description input so user can hit Enter to save
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 0)
  }

  const handleCustomTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const minutes = parseInt(customMinutes)
    if (minutes > 0) {
      setEstimatedMinutes(minutes)
      setCustomMinutes('')
      setIsDropdownOpen(false)
      
      // If there's a description, create the to do immediately
      if (description.trim()) {
        addTask(description.trim(), minutes)
        setDescription('')
        setEstimatedMinutes(30)
        closeWithAnimation() // Close the create to do card with animation after adding
      } else {
        // Return focus to description input so user can hit Enter to save
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
          }
        }, 0)
      }
    }
  }

  const handleCustomTimeBlur = () => {
    const minutes = parseInt(customMinutes)
    if (minutes > 0) {
      setEstimatedMinutes(minutes)
      setCustomMinutes('')
      
      // Close dropdown after a short delay
      setTimeout(() => {
        setIsDropdownOpen(false)
      }, 100)
    }
  }

  const formatEstimatedTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes}m` : `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  const handleAddChecklist = () => {
    setShowChecklist(!showChecklist)
    setIsOptionsDropdownOpen(false)
  }

  // Temporary checklist item handlers (stored locally until task is created)
  const handleAddTempChecklistItem = (description: string) => {
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      taskId: '', // Will be set when task is created
      description,
      isCompleted: false,
      order: tempChecklistItems.length,
      createdAt: new Date()
    }
    setTempChecklistItems([...tempChecklistItems, newItem])
  }

  const handleDeleteTempChecklistItem = (id: string) => {
    setTempChecklistItems(tempChecklistItems.filter(item => item.id !== id))
  }

  const handleToggleTempChecklistItem = (id: string) => {
    setTempChecklistItems(tempChecklistItems.map(item =>
      item.id === id ? { ...item, isCompleted: !item.isCompleted } : item
    ))
  }

  const handleUpdateTempChecklistItem = (id: string, description: string) => {
    setTempChecklistItems(tempChecklistItems.map(item =>
      item.id === id ? { ...item, description } : item
    ))
  }

  const handleReorderTempChecklistItems = (reorderedItems: ChecklistItem[]) => {
    setTempChecklistItems(reorderedItems)
  }

  return (
    <motion.div
      className="w-full max-w-[520px] rounded-[20px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6"
      style={{ backgroundColor: 'var(--color-todoloo-card)' }}
      initial={{ opacity: 1 }}
      animate={{
        opacity: isTransitioning ? 0 : 1
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-8"
      >
        <div className="flex items-center relative">
          <input
            ref={inputRef}
            type="text"
            value={description}
            onChange={handleDescriptionChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            className="flex-1 text-base font-['Outfit'] bg-transparent border-none outline-none"
            style={{ color: 'var(--color-todoloo-text-primary)' }}
          />
                 {!description && (
                   <div className="absolute left-0 top-0 pointer-events-none flex items-start"
                        style={{ color: 'var(--color-todoloo-text-muted)' }}>
                     <RotatingPlaceholder 
                       texts={[
                         "Walk the dog",
                         "Call mom back",
                         "Buy socks",
                         "inbox zero",
                         "Water the monsterra",
                         "Do laundry before I have to wear the same underwear tomorrow",
                         "Cancel whatever I have planned for tonight",
                         "Take out the trash",
                         "Figure out dinner",
                         "Update my LinkedIn",
                       ]}
                       interval={4000}
                       className="text-base font-['Outfit'] leading-tight"
                       onTextChange={(text) => {
                         const historicalStats = getSimilarStats(text)
                         const estimatedTime = estimateTimeFromDescription(text, customKeywords, defaultMinutes, historicalStats)
                         setEstimatedMinutes(estimatedTime)
                       }}
                     />
                   </div>
                 )}
        </div>
        
        {/* Multiplication Preview */}
        {multiplicationPreview && (
          <div className={`border rounded-[12px] p-3 animate-in fade-in-0 slide-in-from-top-2 duration-200 ${
            multiplicationPreview.count > 10 
              ? 'bg-[#FFEBEE] border-[#FFCDD2]' 
              : 'bg-[#E3F2FD] border-[#BBDEFB]'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Plus className={`w-4 h-4 ${multiplicationPreview.count > 10 ? 'text-[#D32F2F]' : 'text-[#1976D2]'}`} />
              <span className={`text-sm font-['Outfit'] font-medium ${
                multiplicationPreview.count > 10 ? 'text-[#D32F2F]' : 'text-[#1565C0]'
              }`}>
                {multiplicationPreview.count > 10 
                  ? `⚠️ Too many to dos (${multiplicationPreview.count}). Maximum 10 allowed.`
                  : `Will create ${multiplicationPreview.count} to dos:`
                }
              </span>
            </div>
            {multiplicationPreview.count <= 10 && (
              <div className="space-y-1">
                {Array.from({ length: Math.min(multiplicationPreview.count, 5) }, (_, i) => (
                  <div key={i} className="text-sm text-[#1565C0] font-['Outfit']">
                    • {multiplicationPreview.baseDescription} ({i + 1})
                  </div>
                ))}
                {multiplicationPreview.count > 5 && (
                  <div className="text-sm text-[#1565C0] font-['Outfit'] text-opacity-70">
                    ... and {multiplicationPreview.count - 5} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Historical Suggestion */}
        {/* {showSuggestion && description.trim() && !multiplicationPreview && (() => {
          const stats = getSimilarStats(description.trim())
          return stats.count > 0 ? (
            <div className="bg-[#F8F9FA] border border-[#E9ECEF] rounded-[12px] p-3 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#6C757D]" />
                  <span className="text-sm text-[#495057] font-['Outfit']">
                    Based on {stats.count} similar to do{stats.count !== 1 ? 's' : ''}: avg {stats.averageMinutes}m
                    {stats.count > 1 && (
                      <span className="text-xs text-[#6C757D] ml-1">
                        (p50: {stats.medianMinutes}m, p90: {stats.p90Minutes}m)
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUseSuggestion}
                  className="text-xs text-[#007BFF] hover:text-[#0056B3] font-['Outfit'] font-medium transition-colors"
                >
                  Use suggestion
                </button>
              </div>
            </div>
          ) : null
        })()} */}

        {/* Temporary Checklist Section (for new todos) */}
        {showChecklist && (
          <TempChecklistSection
            items={tempChecklistItems}
            onAddItem={handleAddTempChecklistItem}
            onDeleteItem={handleDeleteTempChecklistItem}
            onToggleItem={handleToggleTempChecklistItem}
            onUpdateItem={handleUpdateTempChecklistItem}
            onReorder={handleReorderTempChecklistItems}
          />
        )}

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Timer Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`h-8 px-3 rounded-[20px] border flex items-center gap-1 transition-colors cursor-pointer`}
                style={{
                  borderColor: 'var(--color-todoloo-border)',
                  backgroundColor: isDropdownOpen ? 'var(--color-todoloo-muted)' : 'var(--color-todoloo-card)',
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
                  {formatEstimatedTime(estimatedMinutes)}
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
                          onChange={(e) => setCustomMinutes(e.target.value)}
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

            {/* Ellipsis Menu */}
            <div className="relative" ref={optionsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsOptionsDropdownOpen(!isOptionsDropdownOpen)}
                className={`h-8 w-8 rounded-[20px] border flex items-center justify-center transition-colors cursor-pointer`}
                style={{
                  borderColor: 'var(--color-todoloo-border)',
                  backgroundColor: isOptionsDropdownOpen ? 'var(--color-todoloo-muted)' : 'var(--color-todoloo-card)',
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
              >
                <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
              </button>

              {isOptionsDropdownOpen && (
                <div className="absolute top-9 left-0 w-48 bg-[#FEFFFF] rounded-[20px] border border-[#D9D9D9] shadow-[0px_4px_54px_rgba(0,0,0,0.05)] p-2 z-10">
                  <button
                    type="button"
                    onClick={handleAddChecklist}
                    className="w-full text-left px-3 py-2 text-xs text-[#696969] font-['Outfit'] hover:bg-[#F5F5F5] rounded-[10px] transition-colors cursor-pointer"
                  >
                    {showChecklist ? 'Hide Checklist' : 'Add Checklist'}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // Clear any ongoing group when canceling
                delete (window as Window & { __currentGroupId?: string }).__currentGroupId
                setShowCreateTask(false)
              }}
              className="px-3 py-2 text-sm font-medium cursor-pointer transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--color-todoloo-text-secondary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-todoloo-text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--color-todoloo-text-secondary)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!description.trim()}
              className={`px-4 py-2 rounded-[10px] transition-all flex items-center gap-2 border ${
                description.trim()
                  ? 'bg-gradient-to-r from-[#6269F3] to-[#434CF3] hover:opacity-90 cursor-pointer border-[#D9D9D9] dark:border-gray-600'
                  : 'bg-[#E6E6E6] dark:bg-gray-700 cursor-not-allowed border-[#D9D9D9] dark:border-gray-600'
              }`}
            >
              <span className="text-sm font-medium" style={{ color: description.trim() ? 'white' : 'var(--color-todoloo-text-muted)' }}>
                Create
              </span>
              <CornerDownLeft className="w-4 h-4" style={{ color: description.trim() ? 'white' : 'var(--color-todoloo-text-muted)', opacity: 0.5 }} />
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  )
}

export default function ToDoCard() {
  return <ToDoCardContent />
}
