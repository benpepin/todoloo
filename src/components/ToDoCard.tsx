'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, CornerDownLeft, Music, ListChecks } from 'lucide-react'
import { useToDoStore } from '@/store/toDoStore'
import { useHistoryStore } from '@/store/historyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { estimateTimeFromDescription } from '@/utils/timeEstimation'
import type { ChecklistItem } from '@/types'
import UnifiedChecklistSection from '@/components/shared/UnifiedChecklistSection'
import TimeDropdown from '@/components/shared/TimeDropdown'
import OptionsMenu from '@/components/shared/OptionsMenu'

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

function ToDoCardContent() {
  const [description, setDescription] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(30)
  const [multiplicationPreview, setMultiplicationPreview] = useState<{baseDescription: string, count: number} | null>(null)
  const [showChecklist, setShowChecklist] = useState(false)
  const [tempChecklistItems, setTempChecklistItems] = useState<ChecklistItem[]>([])
  const [musicEnabled, setMusicEnabled] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const checklistRef = useRef<{ saveAllItems: () => Promise<ChecklistItem[]> }>(null)
  const addTask = useToDoStore((state) => state.addTask)
  const addChecklistItem = useToDoStore((state) => state.addChecklistItem)
  const setShowCreateTask = useToDoStore((state) => state.setShowCreateTask)
  const getSimilarStats = useHistoryStore((state) => state.getSimilarStats)

  // Get time estimation settings
  const { customKeywords, defaultMinutes } = useSettingsStore()

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
    console.log('[ToDoCard] handleSubmit called', {
      description,
      tempChecklistItemsLength: tempChecklistItems.length,
      hasChecklistRef: !!checklistRef.current,
      timestamp: new Date().toISOString()
    })
    // Get the current checklist items with their latest values
    let checklistItemsToAdd = [...tempChecklistItems]
    if (checklistRef.current) {
      console.log('[ToDoCard] handleSubmit - calling checklistRef.saveAllItems()')
      checklistItemsToAdd = await checklistRef.current.saveAllItems()
      console.log('[ToDoCard] handleSubmit - saveAllItems returned', {
        checklistItemsLength: checklistItemsToAdd.length,
        items: checklistItemsToAdd.map(i => ({ id: i.id, description: i.description })),
        timestamp: new Date().toISOString()
      })
    }
    if (description.trim()) {
      console.log('[ToDoCard] handleSubmit - description valid, proceeding with task creation', { description })
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
                const newTask = await addTask(numberedDescription, estimatedMinutes, groupId, musicEnabled)
                // Add checklist items if any (filter out empty items)
                if (tempChecklistItems.length > 0 && newTask) {
                  for (const item of tempChecklistItems) {
                    if (item.description && item.description.trim()) {
                      await addChecklistItem(newTask.id, item.description)
                    }
                  }
                }
              }
            }
          } else {
            // Create single task in the current group
            console.log('Adding task to group:', groupId, taskDescription)
            const newTask = await addTask(taskDescription, estimatedMinutes, groupId, musicEnabled)
            // Add checklist items if any (filter out empty items)
            if (tempChecklistItems.length > 0 && newTask) {
              console.log('Creating checklist items from tempChecklistItems:', tempChecklistItems)
              for (const item of tempChecklistItems) {
                if (item.description && item.description.trim()) {
                  console.log('Adding checklist item:', item.description)
                  await addChecklistItem(newTask.id, item.description)
                }
              }
            }
          }

          // Reset for next task but keep the card open and group active
          setDescription('')
          setMultiplicationPreview(null)
          setEstimatedMinutes(30)
          setTempChecklistItems([])
          setShowChecklist(false)
          setMusicEnabled(false)

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
          const newTask = await addTask(description.trim(), estimatedMinutes, currentGroupId, musicEnabled)
          // Add checklist items if any (filter out empty items)
          if (tempChecklistItems.length > 0 && newTask) {
            for (const item of tempChecklistItems) {
              if (item.description && item.description.trim()) {
                await addChecklistItem(newTask.id, item.description)
              }
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
      setMusicEnabled(false)

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
          const newTask = await addTask(taskDescription, estimatedMinutes, undefined, musicEnabled)
          // Add checklist items if any (filter out empty items)
          if (checklistItemsToAdd.length > 0 && newTask) {
            console.log('Creating checklist items from checklistItemsToAdd:', checklistItemsToAdd)
            for (const item of checklistItemsToAdd) {
              if (item.description && item.description.trim()) {
                console.log('Adding checklist item:', item.description)
                await addChecklistItem(newTask.id, item.description)
              }
            }
          }
        }
      } else {
        // Single to do (no group)
        const newTask = await addTask(description.trim(), estimatedMinutes, undefined, musicEnabled)
        // Add checklist items if any (filter out empty items)
        if (checklistItemsToAdd.length > 0 && newTask) {
          console.log('Creating checklist items from checklistItemsToAdd:', checklistItemsToAdd)
          for (const item of checklistItemsToAdd) {
            if (item.description && item.description.trim()) {
              console.log('Adding checklist item:', item.description)
              await addChecklistItem(newTask.id, item.description)
            }
          }
        }
      }
    }
  }

  const handleAddChecklist = () => {
    console.log('[ToDoCard] handleAddChecklist called', {
      currentShowChecklist: showChecklist,
      tempChecklistItemsLength: tempChecklistItems.length,
      timestamp: new Date().toISOString()
    })

    // Create first empty item if checklist is being opened and no items exist
    if (!showChecklist && tempChecklistItems.length === 0) {
      console.log('[ToDoCard] handleAddChecklist - creating first empty item')
      handleAddTempChecklistItem('')
    }

    setShowChecklist(!showChecklist)
  }

  // Temporary checklist item handlers (stored locally until task is created)
  const handleAddTempChecklistItem = (description: string) => {
    console.log('[ToDoCard] handleAddTempChecklistItem called', {
      description,
      currentTempItemsLength: tempChecklistItems.length,
      timestamp: new Date().toISOString()
    })
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      taskId: '', // Will be set when task is created
      description,
      isCompleted: false,
      order: tempChecklistItems.length,
      createdAt: new Date()
    }
    console.log('[ToDoCard] handleAddTempChecklistItem - new item created', {
      itemId: newItem.id,
      description: newItem.description,
      newTempItemsLength: tempChecklistItems.length + 1,
      timestamp: new Date().toISOString()
    })
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
    console.log('handleUpdateTempChecklistItem called:', id, description)
    setTempChecklistItems(tempChecklistItems.map(item =>
      item.id === id ? { ...item, description } : item
    ))
    console.log('Updated tempChecklistItems:', tempChecklistItems)
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
        opacity: 1
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <form
        onSubmit={handleSubmit}
        className={`flex flex-col ${showChecklist ? 'gap-2' : 'gap-8'}`}
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
          <UnifiedChecklistSection
            ref={checklistRef}
            items={tempChecklistItems}
            onAddItem={handleAddTempChecklistItem}
            onDeleteItem={handleDeleteTempChecklistItem}
            onToggleItem={handleToggleTempChecklistItem}
            onUpdateItem={handleUpdateTempChecklistItem}
            onReorderItems={handleReorderTempChecklistItems}
            isEditing={true}
            compact={true}
            onDeleteFirstItem={() => {
              setShowChecklist(false)
              setTempChecklistItems([])
            }}
          />
        )}

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* Timer Dropdown */}
            <TimeDropdown
              value={estimatedMinutes}
              onChange={setEstimatedMinutes}
            />

            {/* Ellipsis Menu */}
            <OptionsMenu
              items={[
                {
                  label: showChecklist ? 'Hide Checklist' : 'Add Checklist',
                  onClick: handleAddChecklist,
                  icon: <ListChecks className="w-3 h-3" />
                },
                {
                  label: musicEnabled ? 'Disable Music' : 'Enable Music',
                  onClick: () => setMusicEnabled(!musicEnabled),
                  icon: <Music className="w-3 h-3" />
                }
              ]}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                // Clear any ongoing group when canceling
                delete (window as Window & { __currentGroupId?: string }).__currentGroupId
                setShowCreateTask(false)
              }}
              className="px-3 py-2 text-sm font-['Outfit'] font-medium cursor-pointer transition-colors"
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
              <span className="text-sm font-['Outfit'] font-medium" style={{ color: description.trim() ? 'white' : 'var(--color-todoloo-text-muted)' }}>
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
