'use client'

import { useState } from 'react'
import { useToDoStore } from '@/store/toDoStore'

export function PersonalLists() {
  const { lists, currentListId, switchToPersonalList, createList, updateListName, deleteList } = useToDoStore()
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const handleCreateList = async () => {
    if (newListName.trim()) {
      await createList(newListName.trim())
      setNewListName('')
      setIsAddingList(false)
    }
  }

  const handleStartEdit = (listId: string, currentName: string) => {
    setEditingListId(listId)
    setEditingName(currentName)
  }

  const handleSaveEdit = async () => {
    if (editingListId && editingName.trim()) {
      await updateListName(editingListId, editingName.trim())
      setEditingListId(null)
      setEditingName('')
    }
  }

  const handleCancelEdit = () => {
    setEditingListId(null)
    setEditingName('')
  }

  const handleDeleteList = async (listId: string) => {
    if (confirm('Are you sure you want to delete this list and all its tasks?')) {
      await deleteList(listId)
    }
  }

  return (
    <div className="w-full">
      {/* Personal Lists */}
      <div className="space-y-1" onMouseLeave={() => setHoveredIndex(null)}>
        {lists.map((list, index) => (
          <div
            key={list.id}
            className="relative group"
            onMouseEnter={() => setHoveredIndex(index)}
          >
            {editingListId === list.id ? (
              // Editing mode
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit()
                  if (e.key === 'Escape') handleCancelEdit()
                }}
                onBlur={handleSaveEdit}
                autoFocus
                className="w-full px-3 py-2.5 text-[15px] font-medium rounded-lg
                  bg-white dark:bg-[#2a2a2a]
                  border border-gray-300 dark:border-[#404040]
                  text-[var(--color-todoloo-text-primary)]
                  focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
              />
            ) : (
              // Display mode
              <button
                onClick={() => switchToPersonalList(list.id)}
                onDoubleClick={() => handleStartEdit(list.id, list.name)}
                className={`
                  w-full px-3 py-2.5 text-left text-[15px] font-medium rounded-lg
                  transition-all duration-150 ease-out
                  ${
                    currentListId === list.id
                      ? 'bg-gray-100 dark:bg-[#333333] text-[var(--color-todoloo-text-primary)]'
                      : 'text-[var(--color-todoloo-text-secondary)] hover:bg-gray-50 dark:hover:bg-[#2d2d2d]'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{list.name}</span>
                  {currentListId === list.id && lists.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteList(list.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity
                        text-[var(--color-todoloo-text-muted)] hover:text-red-500
                        dark:hover:text-red-400 px-1"
                      aria-label="Delete list"
                    >
                      ×
                    </button>
                  )}
                </div>
              </button>
            )}
          </div>
        ))}

        {/* Add New List Button (shows on hover) */}
        {isAddingList ? (
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateList()
              if (e.key === 'Escape') {
                setIsAddingList(false)
                setNewListName('')
              }
            }}
            onBlur={() => {
              if (!newListName.trim()) {
                setIsAddingList(false)
              } else {
                handleCreateList()
              }
            }}
            placeholder="List name"
            autoFocus
            className="w-full px-3 py-2.5 text-[15px] font-medium rounded-lg
              bg-white dark:bg-[#2a2a2a]
              border border-gray-300 dark:border-[#404040]
              text-[var(--color-todoloo-text-primary)]
              placeholder:text-[var(--color-todoloo-text-muted)]
              focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
          />
        ) : (
          <button
            onClick={() => setIsAddingList(true)}
            className={`
              w-full px-3 py-2.5 text-left text-[15px] font-medium rounded-lg
              text-[var(--color-todoloo-text-muted)] hover:text-[var(--color-todoloo-text-secondary)]
              hover:bg-gray-50 dark:hover:bg-[#2d2d2d]
              transition-all duration-150 ease-out
              ${hoveredIndex !== null ? 'opacity-100' : 'opacity-0'}
            `}
          >
            + Add Another List
          </button>
        )}
      </div>
    </div>
  )
}
