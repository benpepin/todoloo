'use client'

import { useState, useRef, useEffect } from 'react'
import { Timer, ChevronDown } from 'lucide-react'

interface TimeDropdownProps {
  estimatedMinutes: number
  onTimeSelect: (minutes: number) => void
  className?: string
}

const commonTimes = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
]

export default function TimeDropdown({
  estimatedMinutes,
  onTimeSelect,
  className = ''
}: TimeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customMinutes, setCustomMinutes] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        const minutes = parseInt(customMinutes)
        if (minutes > 0) {
          onTimeSelect(minutes)
          setCustomMinutes('')
        }
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [customMinutes, onTimeSelect])

  const handleTimeSelect = (minutes: number) => {
    onTimeSelect(minutes)
    setIsOpen(false)
  }

  const handleCustomTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const minutes = parseInt(customMinutes)
    if (minutes > 0) {
      onTimeSelect(minutes)
      setCustomMinutes('')
      setIsOpen(false)
    }
  }

  const formatEstimatedTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0
      ? `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes}m`
      : `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-3 rounded-[20px] border flex items-center gap-1 transition-colors cursor-pointer"
        style={{
          borderColor: 'var(--color-todoloo-border)',
          backgroundColor: isOpen ? 'var(--color-todoloo-muted)' : 'var(--color-todoloo-card)'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'var(--color-todoloo-muted)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.backgroundColor = 'var(--color-todoloo-card)'
          }
        }}
      >
        <Timer className="w-3.5 h-3.5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
        <span className="text-xs font-inter" style={{ color: 'var(--color-todoloo-text-secondary)', transform: 'translateY(1px)' }}>
          {formatEstimatedTime(estimatedMinutes)}
        </span>
        <ChevronDown
          className={`w-3 h-3 transition-transform translate-y-px ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--color-todoloo-text-secondary)' }}
        />
      </button>

      {isOpen && (
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
  )
}
