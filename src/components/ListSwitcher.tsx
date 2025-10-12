'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (user?.id) {
      loadSharedLists()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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

  // Don't render if no shared lists
  if (sharedLists.length === 0) {
    return null
  }

  return (
    <div className="w-full mb-4">
      <div className="relative">
        <button
          onClick={() => setShowListMenu(!showListMenu)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700 truncate">{getCurrentListName()}</span>
          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
        </button>

        {showListMenu && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10">
            <button
              onClick={() => switchToList(userId || '')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-100"
            >
              My List
            </button>
            {sharedLists.map((list) => (
              <button
                key={list.ownerId}
                onClick={() => switchToList(list.ownerId)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                {list.ownerEmail}&apos;s List
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
