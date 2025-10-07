'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Palette, History, Settings, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useSupabase } from '@/components/SupabaseProvider'

export default function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { supabase } = useSupabase()

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen])

  const handleAppearanceToggle = () => {
    toggleTheme()
    // Don't close menu after toggling theme
  }

  const handleInsights = () => {
    setIsOpen(false)
    router.push('/insights')
  }

  const handleSettings = () => {
    setIsOpen(false)
    router.push('/settings')
  }

  const handleLogOut = async () => {
    setIsOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-0 rounded-full transition-all duration-200 cursor-pointer hover:opacity-70"
        style={{ color: 'var(--color-todoloo-text-secondary)' }}
        aria-label="Settings menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Menu Popup */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl shadow-lg border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            backgroundColor: 'var(--color-todoloo-card)',
            borderColor: 'var(--color-todoloo-border)',
          }}
        >
          {/* Appearance - with inline toggle */}
          <button
            onClick={handleAppearanceToggle}
            className="w-full px-4 py-3 flex items-center justify-between transition-colors cursor-pointer"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
              <span className="text-base font-['Geist']" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                Appearance
              </span>
            </div>
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4" style={{ color: 'var(--color-todoloo-text-muted)' }} />
              ) : (
                <Sun className="w-4 h-4" style={{ color: 'var(--color-todoloo-text-muted)' }} />
              )}
            </div>
          </button>

          {/* Divider */}
          <div className="h-px" style={{ backgroundColor: 'var(--color-todoloo-border)' }} />

          {/* Insights */}
          <button
            onClick={handleInsights}
            className="w-full px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <History className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
            <span className="text-base font-['Geist']" style={{ color: 'var(--color-todoloo-text-primary)' }}>
              Insights
            </span>
          </button>

          {/* Divider */}
          <div className="h-px" style={{ backgroundColor: 'var(--color-todoloo-border)' }} />

          {/* Settings */}
          <button
            onClick={handleSettings}
            className="w-full px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <Settings className="w-5 h-5" style={{ color: 'var(--color-todoloo-text-secondary)' }} />
            <span className="text-base font-['Geist']" style={{ color: 'var(--color-todoloo-text-primary)' }}>
              Settings
            </span>
          </button>

          {/* Divider */}
          <div className="h-px" style={{ backgroundColor: 'var(--color-todoloo-border)' }} />

          {/* Log Out */}
          <button
            onClick={handleLogOut}
            className="w-full px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <LogOut className="w-5 h-5" style={{ color: '#ef4444' }} />
            <span className="text-base font-['Geist']" style={{ color: '#ef4444' }}>
              Log out
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
