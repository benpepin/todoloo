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
          className="w-full px-0 py-2 text-lg font-normal font-outfit
            bg-transparent
            border-none
            text-[var(--color-todoloo-text-primary)]
            focus:outline-none
            transition-all duration-200 ease-out"
        />
      ) : (
        // Display mode
        <div
          onClick={onSwitch}
          onDoubleClick={onEdit}
          className={`
            w-full px-0 py-2 text-left text-lg font-normal font-outfit
            transition-all duration-200 ease-out cursor-pointer
            ${
              isActive
                ? 'text-[var(--color-todoloo-text-primary)] font-semibold'
                : 'text-[var(--color-todoloo-text-secondary)] hover:text-[var(--color-todoloo-text-primary)]'
            }
            ${isOver ? 'text-blue-500' : ''}
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
  const { lists, currentListId, currentListOwnerId, currentListOwnerPermission, userId, switchToPersonalList, createList, updateListName, deleteList } = useToDoStore()
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Can add lists if viewing own lists OR have write permission on shared user's lists
  const canAddList = !currentListOwnerId || currentListOwnerId === userId || currentListOwnerPermission === 'write'

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
    <div className="w-full flex flex-col gap-2">
      {/* Personal Lists */}
      <div className="space-y-0" onMouseLeave={() => setHoveredIndex(null)}>
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
      </div>

      {/* Add New List Button - only if user has permission */}
      {canAddList && (
        isAddingList ? (
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
            className="w-full px-0 py-2 text-lg font-normal font-outfit
              bg-transparent
              border-none
              text-[var(--color-todoloo-text-primary)]
              placeholder:text-[var(--color-todoloo-text-muted)]
              focus:outline-none
              transition-all duration-200 ease-out"
          />
        ) : (
          <button
            onClick={() => setIsAddingList(true)}
            className="w-full px-0 py-2 text-left text-lg font-normal font-outfit
              text-[var(--color-todoloo-text-muted)]
              transition-all duration-200 ease-out cursor-pointer
              hover:text-[var(--color-todoloo-text-secondary)]"
          >
            +Add Another List
          </button>
        )
      )}
    </div>
  )
}
