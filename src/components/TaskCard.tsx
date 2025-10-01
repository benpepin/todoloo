'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Timer, ChevronDown } from 'lucide-react'
import { useTaskStore } from '@/store/taskStore'

// Rotating placeholder text component
function RotatingPlaceholder({ 
  texts, 
  interval = 2000, 
  className = "" 
}: { 
  texts: string[], 
  interval?: number, 
  className?: string 
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % texts.length)
        setIsVisible(true)
      }, 300) // Half of the transition duration
    }, interval)

    return () => clearInterval(timer)
  }, [texts.length, interval])

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

export default function TaskCard() {
  const [description, setDescription] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(30)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const addTask = useTaskStore((state) => state.addTask)
  const setShowCreateTask = useTaskStore((state) => state.setShowCreateTask)


  const commonTimes = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
  ]

  // Smart time estimation based on task keywords
  const estimateTimeFromDescription = (description: string): number => {
    const text = description.toLowerCase()
    
    // Quick tasks (5-15 mins)
    if (text.includes('shower') || text.includes('bath')) return 20
    if (text.includes('email') || text.includes('reply')) return 10
    if (text.includes('call') || text.includes('phone')) return 15
    if (text.includes('quick') || text.includes('fast')) return 10
    if (text.includes('check') || text.includes('review')) return 15
    
    // Medium tasks (30-60 mins)
    if (text.includes('cook') || text.includes('meal') || text.includes('dinner')) return 45
    if (text.includes('exercise') || text.includes('workout') || text.includes('gym')) return 60
    if (text.includes('clean') || text.includes('tidy') || text.includes('organize')) return 30
    if (text.includes('read') || text.includes('book') || text.includes('article')) return 45
    if (text.includes('shopping') || text.includes('grocery') || text.includes('store')) return 60
    if (text.includes('meeting') || text.includes('call') || text.includes('discussion')) return 30
    
    // Longer tasks (1-2 hours)
    if (text.includes('project') || text.includes('work') || text.includes('coding')) return 90
    if (text.includes('study') || text.includes('learn') || text.includes('course')) return 90
    if (text.includes('write') || text.includes('document') || text.includes('report')) return 75
    if (text.includes('design') || text.includes('create') || text.includes('build')) return 120
    if (text.includes('research') || text.includes('investigate') || text.includes('analyze')) return 90
    
    // Very long tasks (2+ hours)
    if (text.includes('deep') || text.includes('thorough') || text.includes('complete')) return 180
    if (text.includes('marathon') || text.includes('all day') || text.includes('extensive')) return 240
    
    // Default fallback
    return 30
  }

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

  // Auto-focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDescription = e.target.value
    setDescription(newDescription)
    
    // Auto-estimate time based on description
    if (newDescription.trim()) {
      const estimatedTime = estimateTimeFromDescription(newDescription)
      console.log('Smart estimation:', newDescription, '->', estimatedTime, 'minutes')
      setEstimatedMinutes(estimatedTime)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (description.trim()) {
      addTask(description.trim(), estimatedMinutes)
      setDescription('')
      setEstimatedMinutes(30)
      setShowCreateTask(false) // Close the create task card after adding
    }
  }

  const handleTimeSelect = (minutes: number) => {
    setEstimatedMinutes(minutes)
    setIsDropdownOpen(false)
  }

  const handleCustomTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const minutes = parseInt(customMinutes)
    if (minutes > 0) {
      setEstimatedMinutes(minutes)
      setCustomMinutes('')
      setIsDropdownOpen(false)
      
      // If there's a description, create the task immediately
      if (description.trim()) {
        addTask(description.trim(), minutes)
        setDescription('')
        setEstimatedMinutes(30)
        setShowCreateTask(false) // Close the create task card after adding
      }
    }
  }

  return (
    <div className="w-[600px] bg-[#FEFFFF] rounded-[20px] border border-[#D9D9D9] shadow-[0px_4px_54px_rgba(0,0,0,0.05)] p-3 animate-in fade-in-0 zoom-in-95 duration-200">
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div className="flex items-center relative">
          <input
            ref={inputRef}
            type="text"
            value={description}
            onChange={handleDescriptionChange}
            className="flex-1 text-base text-[#2D1B1B] font-inter bg-transparent border-none outline-none"
          />
                 {!description && (
                   <div className="absolute left-0 pointer-events-none text-[#989999]">
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
                       className="text-base font-inter"
                     />
                   </div>
                 )}
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
                {estimatedMinutes < 60 ? `${estimatedMinutes} minutes` : `${Math.floor(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`}
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
            type="submit"
            className="p-1.5 bg-gradient-to-r from-[#9F8685] to-[#583636] rounded-[10px] hover:opacity-90 transition-opacity"
            style={{ cursor: 'pointer' }}
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
      </form>
    </div>
  )
}
