'use client'

import { useEffect, useState, useRef } from 'react'
import { useToDoStore } from '@/store/toDoStore'
import { useSupabase } from './SupabaseProvider'
import { getSharedLists } from '@/lib/db'
import { ChevronDown } from 'lucide-react'

export default function ListSwitcher() {
  const userId = useToDoStore((state) => state.userId)
  const currentListOwnerId = useToDoStore((state) => state.currentListOwnerId)

  const [sharedLists, setSharedLists] = useState<Array<{ ownerId: string, ownerEmail: string }>>([])
  const [showListMenu, setShowListMenu] = useState(false)
  const { user } = useSupabase()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user?.id) {
      loadSharedLists()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowListMenu(false)
      }
    }

    if (showListMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showListMenu])

  const loadSharedLists = async () => {
    if (!user?.id) return
    try {
      const lists = await getSharedLists(user.id)
      setSharedLists(lists)
    } catch (error) {
      console.error('Error loading shared lists:', error)
    }
  }

  const switchToList = async (ownerId: string) => {
    const switchToListStore = useToDoStore.getState().switchToList
    await switchToListStore(ownerId)
    setShowListMenu(false)
  }

  const getCurrentListName = () => {
    if (!currentListOwnerId || currentListOwnerId === userId) {
      return 'My List'
    }
    const sharedList = sharedLists.find(l => l.ownerId === currentListOwnerId)
    return sharedList ? `${sharedList.ownerEmail}'s List` : 'Shared List'
  }

  const isCurrentList = (ownerId: string) => {
    if (!currentListOwnerId || currentListOwnerId === userId) {
      return ownerId === userId
    }
    return currentListOwnerId === ownerId
  }

  // Don't render if no shared lists and we're on our own list
  if (sharedLists.length === 0 && (!currentListOwnerId || currentListOwnerId === userId)) {
    return null
  }

  return (
    <div className="w-full" ref={menuRef}>
      <div className="relative">
        {/* Dropdown Button */}
        <button
          onClick={() => setShowListMenu(!showListMenu)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3
            bg-white dark:bg-[#2a2a2a]
            rounded-xl border border-gray-200 dark:border-[#404040]
            hover:border-gray-300 dark:hover:border-[#505050]
            hover:shadow-sm
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
        >
          <span className="text-[15px] font-medium text-[var(--color-todoloo-text-primary)] truncate">
            {getCurrentListName()}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-[var(--color-todoloo-text-muted)] flex-shrink-0
              transition-transform duration-200 ${showListMenu ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {showListMenu && (
          <div className="absolute top-full mt-2 left-0 right-0
            bg-white dark:bg-[#2a2a2a]
            border border-gray-200 dark:border-[#404040]
            rounded-xl shadow-xl
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ zIndex: 9999 }}>
            {/* My List */}
            <button
              onClick={() => switchToList(userId || '')}
              className={`w-full text-left px-4 py-3
                text-[15px] font-medium
                transition-colors duration-150
                ${
                  isCurrentList(userId || '')
                    ? 'bg-gray-50 dark:bg-[#333333] text-[var(--color-todoloo-text-primary)]'
                    : 'text-[var(--color-todoloo-text-secondary)] hover:bg-gray-50 dark:hover:bg-[#2d2d2d]'
                }
                border-b border-gray-100 dark:border-[#383838]`}
            >
              <div className="flex items-center justify-between">
                <span>My List</span>
                {isCurrentList(userId || '') && (
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>

            {/* Shared Lists */}
            {sharedLists.map((list, index) => (
              <button
                key={list.ownerId}
                onClick={() => switchToList(list.ownerId)}
                className={`w-full text-left px-4 py-3
                  text-[15px] font-medium
                  transition-colors duration-150
                  ${
                    isCurrentList(list.ownerId)
                      ? 'bg-gray-50 dark:bg-[#333333] text-[var(--color-todoloo-text-primary)]'
                      : 'text-[var(--color-todoloo-text-secondary)] hover:bg-gray-50 dark:hover:bg-[#2d2d2d]'
                  }
                  ${index < sharedLists.length - 1 ? 'border-b border-gray-100 dark:border-[#383838]' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{list.ownerEmail}&apos;s List</span>
                  {isCurrentList(list.ownerId) && (
                    <svg className="w-4 h-4 text-gray-600 dark:text-gray-300 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
