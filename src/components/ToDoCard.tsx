'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Timer, ChevronDown, CornerDownLeft } from 'lucide-react'
import { useToDoStore } from '@/store/toDoStore'
import { useHistoryStore } from '@/store/historyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { estimateTimeFromDescription } from '@/utils/timeEstimation'

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
  const [multiplicationPreview, setMultiplicationPreview] = useState<{baseDescription: string, count: number} | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const addTask = useToDoStore((state) => state.addTask)
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

  const handleSubmit = (e: React.FormEvent) => {
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
                addTask(numberedDescription, estimatedMinutes, groupId)
              }
            }
          } else {
            // Create single task in the current group
            console.log('Adding task to group:', groupId, taskDescription)
            addTask(taskDescription, estimatedMinutes, groupId)
          }

          // Reset for next task but keep the card open and group active
          setDescription('')
          setMultiplicationPreview(null)
          setEstimatedMinutes(30)

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
          addTask(description.trim(), estimatedMinutes, currentGroupId)

          // Clear the group ID since user didn't end with "and"
          // This closes the group - user is done adding to it
          delete (window as Window & { __currentGroupId?: string }).__currentGroupId

          setDescription('')
          setEstimatedMinutes(30)
          setShowCreateTask(false) // Close the card since group is complete
          return
        }
      }

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
          addTask(taskDescription, estimatedMinutes)
        }
      } else {
        // Single to do (no group)
        addTask(description.trim(), estimatedMinutes)
      }

      // Clear any ongoing group when creating a standalone task
      delete (window as Window & { __currentGroupId?: string }).__currentGroupId
      setDescription('')
      setEstimatedMinutes(30)
      setShowCreateTask(false) // Close the create to do card after adding
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
        setShowCreateTask(false) // Close the create to do card after adding
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

  return (
    <div className="w-full max-w-[460px] rounded-[20px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] p-6 animate-in fade-in-0 zoom-in-95 duration-200"
         style={{ backgroundColor: 'var(--color-todoloo-card)' }}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
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
            className="flex-1 text-base font-['Geist'] bg-transparent border-none outline-none"
            style={{ color: 'var(--color-todoloo-text-secondary)' }}
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
                       className="text-base font-['Geist'] leading-tight"
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
              <span className={`text-sm font-inter font-medium ${
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
                  <div key={i} className="text-sm text-[#1565C0] font-inter">
                    • {multiplicationPreview.baseDescription} ({i + 1})
                  </div>
                ))}
                {multiplicationPreview.count > 5 && (
                  <div className="text-sm text-[#1565C0] font-inter text-opacity-70">
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
                  <span className="text-sm text-[#495057] font-inter">
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
                  className="text-xs text-[#007BFF] hover:text-[#0056B3] font-inter font-medium transition-colors"
                >
                  Use suggestion
                </button>
              </div>
            </div>
          ) : null
        })()} */}
        
        <div className="flex justify-between items-end">
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
              <span className="text-xs font-inter" style={{ color: 'var(--color-todoloo-text-secondary)', transform: 'translateY(1px)' }}>
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
    </div>
  )
}

export default function ToDoCard() {
  return <ToDoCardContent />
}
