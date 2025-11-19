'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { MoreHorizontal, ChevronDown } from 'lucide-react'

export interface MenuOption {
  /** Display label for the option */
  label: string | ReactNode
  /** Click handler */
  onClick: () => void
  /** Optional icon to display */
  icon?: ReactNode
  /** Optional className for the button */
  className?: string
}

export interface MenuSubmenu {
  /** Display label for the submenu trigger */
  label: string
  /** Submenu items */
  items: MenuOption[]
  /** Condition to show this submenu */
  showIf?: boolean
}

export type MenuItem = MenuOption | MenuSubmenu

interface OptionsMenuProps {
  /** Menu items (options or submenus) */
  items: MenuItem[]
  /** Optional className for the container */
  className?: string
  /** Optional trigger button element (defaults to MoreHorizontal icon) */
  trigger?: ReactNode
}

function isSubmenu(item: MenuItem): item is MenuSubmenu {
  return 'items' in item
}

export default function OptionsMenu({ items, className = '', trigger }: OptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setOpenSubmenuIndex(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleOptionClick = (onClick: () => void) => {
    onClick()
    setIsOpen(false)
    setOpenSubmenuIndex(null)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 w-8 rounded-[20px] border flex items-center justify-center transition-colors cursor-pointer"
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
          aria-label="More options"
        >
          <MoreHorizontal className="w-4 h-4" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
        </button>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-9 left-0 w-48 bg-[#FEFFFF] rounded-[20px] border border-[#D9D9D9] shadow-[0px_4px_54px_rgba(0,0,0,0.05)] p-2 z-10">
          <div className="space-y-1">
            {items.map((item, index) => {
              // Handle submenu
              if (isSubmenu(item)) {
                // Check if submenu should be shown
                if (item.showIf === false) {
                  return null
                }

                return (
                  <div key={index} className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setOpenSubmenuIndex(index)}
                      onMouseLeave={() => setOpenSubmenuIndex(null)}
                      className="w-full text-left px-3 py-2 text-xs text-[#696969] font-['Outfit'] hover:bg-[#F5F5F5] rounded-[10px] transition-colors cursor-pointer flex items-center justify-between"
                    >
                      {item.label}
                      <ChevronDown className="w-3 h-3 -rotate-90" />
                    </button>

                    {openSubmenuIndex === index && (
                      <div
                        className="absolute left-full top-0 ml-1 w-40 bg-[#FEFFFF] rounded-[20px] border border-[#D9D9D9] shadow-[0px_4px_54px_rgba(0,0,0,0.05)] p-2 z-20"
                        onMouseEnter={() => setOpenSubmenuIndex(index)}
                        onMouseLeave={() => setOpenSubmenuIndex(null)}
                      >
                        {item.items.map((subItem, subIndex) => (
                          <button
                            key={subIndex}
                            type="button"
                            onClick={() => handleOptionClick(subItem.onClick)}
                            className={subItem.className || "w-full text-left px-3 py-2 text-xs text-[#696969] font-['Outfit'] hover:bg-[#F5F5F5] rounded-[10px] transition-colors cursor-pointer"}
                          >
                            {subItem.icon && <span className="inline-flex items-center gap-2">{subItem.icon}</span>}
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              // Handle regular option
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleOptionClick(item.onClick)}
                  className={item.className || "w-full text-left px-3 py-2 text-xs text-[#696969] font-['Outfit'] hover:bg-[#F5F5F5] rounded-[10px] transition-colors cursor-pointer flex items-center gap-2"}
                >
                  {item.icon}
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
