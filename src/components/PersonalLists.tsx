'use client'

import { useState } from 'react'
import { useDroppable, DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors, DragCancelEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { useToDoStore } from '@/store/toDoStore'

interface SortableListItemProps {
  listId: string
  listName: string
  isActive: boolean
  isEditing: boolean
  editingName: string
  canDelete: boolean
  canEdit: boolean
  disableDragAndDrop?: boolean
  onEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onSwitch: () => void
  setEditingName: (name: string) => void
}

function SortableListItem({
  listId,
  listName,
  isActive,
  isEditing,
  editingName,
  canDelete,
  canEdit,
  disableDragAndDrop = false,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onSwitch,
  setEditingName
}: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: listId })

  const { isOver } = useDroppable({
    id: `list-${listId}`,
    data: {
      type: 'list',
      listId
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group w-full"
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
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span
              className="flex-1 truncate"
              onClick={onSwitch}
              onDoubleClick={canEdit ? onEdit : undefined}
            >
              {listName}
            </span>
            {/* Delete Button - appears on hover */}
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className={`transition-opacity p-1 flex-shrink-0
                  text-[var(--color-todoloo-text-muted)] hover:text-red-500
                  ${disableDragAndDrop ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                aria-label="Delete list"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {/* Drag Handle - moved to right */}
            {!disableDragAndDrop && (
              <button
                {...attributes}
                {...listeners}
                className="opacity-0 group-hover:opacity-100 transition-opacity
                  text-[var(--color-todoloo-text-muted)] hover:text-[var(--color-todoloo-text-primary)]
                  cursor-grab active:cursor-grabbing p-1 flex-shrink-0"
                aria-label="Drag to reorder"
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface PersonalListsProps {
  disableDragAndDrop?: boolean
  onListClick?: () => void
}

export default function PersonalLists({ disableDragAndDrop = false, onListClick }: PersonalListsProps = {}) {
  const { lists, currentListId, currentListOwnerId, currentListOwnerPermission, userId, switchToPersonalList, createList, updateListName, deleteList, reorderLists } = useToDoStore()
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Can add lists if viewing own lists OR have write permission on shared user's lists
  const canAddList = !currentListOwnerId || currentListOwnerId === userId || currentListOwnerPermission === 'write'

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    })
  )

  const activeList = lists.find(list => list.id === activeId)

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = lists.findIndex((list) => list.id === active.id)
      const newIndex = lists.findIndex((list) => list.id === over.id)

      const newLists = arrayMove(lists, oldIndex, newIndex)
      await reorderLists(newLists)
    }

    setActiveId(null)
  }

  const listsContent = (
    <div className="space-y-0 overflow-x-hidden" onMouseLeave={() => setHoveredIndex(null)}>
      {lists.map((list, index) => {
        // Can edit if it's user's own list OR viewing any shared list (owner's lists)
        const canEdit = list.userId === userId || currentListOwnerId !== null

        return (
          <div key={list.id} onMouseEnter={() => setHoveredIndex(index)}>
            <SortableListItem
              listId={list.id}
              listName={list.name}
              isActive={currentListId === list.id}
              isEditing={editingListId === list.id}
              editingName={editingName}
              canDelete={lists.length > 1}
              canEdit={canEdit}
              disableDragAndDrop={disableDragAndDrop}
              onEdit={() => handleStartEdit(list.id, list.name)}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onDelete={() => handleDeleteList(list.id)}
              onSwitch={() => {
                switchToPersonalList(list.id)
                if (onListClick) onListClick()
              }}
              setEditingName={setEditingName}
            />
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="w-full flex flex-col gap-2 overflow-x-hidden">
      {/* Personal Lists */}
      {disableDragAndDrop ? (
        listsContent
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={lists.map(list => list.id)} strategy={verticalListSortingStrategy}>
            {listsContent}
          </SortableContext>
          <DragOverlay>
            {activeList ? (
              <div className="relative group w-full bg-[var(--color-todoloo-sidebar)] px-0 py-2">
                <div className="text-lg font-normal font-outfit text-[var(--color-todoloo-text-primary)]">
                  {activeList.name}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

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
