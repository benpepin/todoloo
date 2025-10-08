'use client'

import { useEffect, useState } from 'react'
import { getCurrentDate } from '@/utils/timeUtils'
import { useToDoStore } from '@/store/toDoStore'
import { useSupabase } from './SupabaseProvider'
import { getSharedLists } from '@/lib/db'
import { ChevronDown } from 'lucide-react'

export default function Header() {
  const toggleCreateTask = useToDoStore((state) => state.toggleCreateTask)
  const showCreateTask = useToDoStore((state) => state.showCreateTask)
  const userId = useToDoStore((state) => state.userId)
  const currentListOwnerId = useToDoStore((state) => state.currentListOwnerId)
  const loadTasks = useToDoStore((state) => state.loadTasks)

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

  const handleClick = () => {
    toggleCreateTask()
  }

  const switchToList = async (ownerId: string) => {
    // Set the current list owner and reload tasks
    useToDoStore.setState({ currentListOwnerId: ownerId })
    await loadTasks()
    setShowListMenu(false)
  }

  const getCurrentListName = () => {
    if (!currentListOwnerId || currentListOwnerId === userId) {
      return 'My List'
    }
    const sharedList = sharedLists.find(l => l.ownerId === currentListOwnerId)
    return sharedList ? `${sharedList.ownerEmail}'s List` : 'Shared List'
  }

  return (
    <div className="flex justify-center w-full px-4 pt-4">
      <div className="w-[600px] inline-flex justify-between items-end">
        <div className="inline-flex flex-col justify-start items-start gap-2">
          <div className="justify-start text-neutral-700 text-base font-bold font-['Inter']">Todoloo</div>
          <div className="justify-start text-neutral-700 text-sm font-normal font-['Inter']">{getCurrentDate()}</div>

          {/* List Switcher - only show if user has shared lists */}
          {sharedLists.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowListMenu(!showListMenu)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs font-medium text-gray-700">{getCurrentListName()}</span>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>

              {showListMenu && (
                <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[200px]">
                  <button
                    onClick={() => switchToList(userId || '')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs font-medium text-gray-700 border-b border-gray-100"
                  >
                    My List
                  </button>
                  {sharedLists.map((list) => (
                    <button
                      key={list.ownerId}
                      onClick={() => switchToList(list.ownerId)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-xs font-medium text-gray-700"
                    >
                      {list.ownerEmail}&apos;s List
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end items-center gap-8">
          <div className="px-4 py-2 bg-zinc-100 rounded-md shadow-[0px_4px_7px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-zinc-300 inline-flex flex-col justify-start items-start gap-2.5">
            <button
              onClick={handleClick}
              className="inline-flex justify-center items-center gap-2.5 cursor-pointer"
            >
              <div className="justify-start text-neutral-800 text-sm font-medium font-['Inter']">New Todo (n)</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

