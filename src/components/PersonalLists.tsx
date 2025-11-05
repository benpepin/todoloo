'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useToDoStore } from '@/store/toDoStore'

interface DroppableListItemProps {
  listId: string
  listName: string
  isActive: boolean
  isEditing: boolean
  editingName: string
  canDelete: boolean
  onEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onSwitch: () => void
  setEditingName: (name: string) => void
}

function DroppableListItem({
  listId,
  listName,
  isActive,
  isEditing,
  editingName,
  canDelete,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onSwitch,
  setEditingName
}: DroppableListItemProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `list-${listId}`,
    data: {
      type: 'list',
      listId
    }
  })

  return (
    <div
      ref={setNodeRef}
      className="relative group"
    >
      {isEditing ? (
        // Editing mode
        <input
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit()
            if (e.key === 'Escape') onCancelEdit()
          }}
          onBlur={onSaveEdit}
          autoFocus
          className="w-full px-3 py-2.5 text-[15px] font-medium rounded-lg
            bg-white dark:bg-[#2a2a2a]
            border border-gray-300 dark:border-[#404040]
            text-[var(--color-todoloo-text-primary)]
            focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
        />
      ) : (
        // Display mode
        <div
          onClick={onSwitch}
          onDoubleClick={onEdit}
          className={`
            w-full px-3 py-2.5 text-left text-[15px] font-medium rounded-lg
            transition-all duration-150 ease-out cursor-pointer
            ${
              isActive
                ? 'bg-gray-100 dark:bg-[#333333] text-[var(--color-todoloo-text-primary)]'
                : 'text-[var(--color-todoloo-text-secondary)] hover:bg-gray-50 dark:hover:bg-[#2d2d2d]'
            }
            ${isOver ? 'ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
          `}
        >
          <div className="flex items-center justify-between">
            <span className="flex-1">
              {listName}
            </span>
            {isActive && canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
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
        </div>
      )}
    </div>
  )
}

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
          <div key={list.id} onMouseEnter={() => setHoveredIndex(index)}>
            <DroppableListItem
              listId={list.id}
              listName={list.name}
              isActive={currentListId === list.id}
              isEditing={editingListId === list.id}
              editingName={editingName}
              canDelete={lists.length > 1}
              onEdit={() => handleStartEdit(list.id, list.name)}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onDelete={() => handleDeleteList(list.id)}
              onSwitch={() => switchToPersonalList(list.id)}
              setEditingName={setEditingName}
            />
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
