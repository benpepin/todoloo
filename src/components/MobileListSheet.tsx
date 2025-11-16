'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import PersonalLists from './PersonalLists'
import ListSwitcher from './ListSwitcher'

interface MobileListSheetProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileListSheet({ isOpen, onClose }: MobileListSheetProps) {
  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998] lg:hidden"
        onClick={onClose}
        style={{
          animation: 'fadeIn 0.3s ease-out'
        }}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[9999] lg:hidden rounded-t-3xl shadow-2xl overflow-hidden"
        style={{
          maxHeight: '85vh',
          backgroundColor: 'var(--color-todoloo-background)',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--color-todoloo-background)',
            borderColor: 'var(--color-todoloo-border)'
          }}
        >
          <h2
            className="text-xl font-semibold"
            style={{ color: 'var(--color-todoloo-text)' }}
          >
            My Lists
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X size={24} style={{ color: 'var(--color-todoloo-text)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {/* List Switcher (if user has shared lists) */}
          <div className="mb-6">
            <ListSwitcher />
          </div>

          {/* Personal Lists */}
          <div>
            <PersonalLists disableDragAndDrop={true} onListClick={onClose} />
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
