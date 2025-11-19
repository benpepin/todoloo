'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, X, Plus, GripVertical } from 'lucide-react'
import { ChecklistItem } from '@/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface UnifiedChecklistSectionProps {
  items: ChecklistItem[]
  onAddItem: (description: string) => void | Promise<void>
  onDeleteItem: (id: string) => void | Promise<void>
  onToggleItem: (id: string) => void | Promise<void>
  onUpdateItem: (id: string, description: string) => void | Promise<void>
  onReorderItems: (reorderedItems: ChecklistItem[]) => void | Promise<void>
  isEditing?: boolean
  className?: string
  /** Use compact styling (for temp checklists in create card) */
  compact?: boolean
}

interface SortableChecklistItemProps {
  item: ChecklistItem
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, description: string) => void
  onDeleteAndFocusPrevious?: () => void
  shouldStartEditing?: boolean
  compact?: boolean
}

function SortableChecklistItem({
  item,
  onToggle,
  onDelete,
  onUpdate,
  onDeleteAndFocusPrevious,
  shouldStartEditing,
  compact = false
}: SortableChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.description)
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Handle shouldStartEditing prop
  useEffect(() => {
    if (shouldStartEditing && !isEditing) {
      setIsEditing(true)
    }
  }, [shouldStartEditing, isEditing])

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(item.id, editValue.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation() // Prevent all key events from bubbling
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(item.description)
      setIsEditing(false)
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && onDeleteAndFocusPrevious) {
      // Get cursor position
      const input = e.currentTarget
      const cursorPosition = input.selectionStart || 0

      // Only handle if input is empty OR if backspace is pressed at position 0
      if (!editValue || (e.key === 'Backspace' && cursorPosition === 0)) {
        e.preventDefault()
        onDeleteAndFocusPrevious()
      }
    }
  }

  const baseClasses = compact
    ? "group flex items-center gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-[var(--color-todoloo-muted)]"
    : "group flex items-center gap-2 py-2 rounded-lg transition-colors hover:bg-[var(--color-todoloo-muted)] relative lg:ml-6"

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={baseClasses}
      tabIndex={-1}
      onKeyDown={(e) => {
        // Stop keyboard events from bubbling to parent task
        e.stopPropagation()
      }}
    >
      {/* Drag Handle - only visible on hover */}
      <button
        className={compact
          ? "opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
          : "opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hidden lg:block flex-shrink-0"
        }
        tabIndex={0}
        onPointerDown={(e) => {
          // Stop propagation to prevent parent task card from being selected
          e.stopPropagation()
        }}
        onMouseDown={(e) => {
          // Stop propagation to prevent parent task card from being selected
          e.stopPropagation()
        }}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" style={{ color: 'var(--color-todoloo-text-muted)' }} />
      </button>

      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        tabIndex={0}
        onKeyDown={(e) => {
          // Prevent spacebar from triggering drag - just toggle checkbox
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            onToggle(item.id)
          }
        }}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all duration-150 flex-shrink-0 ${
          !item.isCompleted ? 'hover:scale-90' : ''
        }`}
        style={{
          backgroundColor: item.isCompleted ? 'var(--color-todoloo-gradient-start)' : 'transparent',
          borderColor: item.isCompleted ? 'var(--color-todoloo-gradient-start)' : 'var(--color-todoloo-border)',
          color: item.isCompleted ? 'white' : 'transparent'
        }}
      >
        {item.isCompleted && <Check className="w-3 h-3" />}
      </button>

      {/* Description */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => {
            e.stopPropagation() // Prevent space bar from triggering drag
            setEditValue(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={compact
            ? "flex-1 text-sm font-['Outfit'] bg-transparent border-none outline-none"
            : "flex-1 text-sm font-['Outfit'] bg-transparent border-none outline-none lg:pr-8"
          }
          style={{
            color: 'var(--color-todoloo-text-secondary)'
          }}
        />
      ) : (
        <span
          className={`flex-1 text-sm font-['Outfit'] cursor-text ${compact ? '' : 'lg:pr-8'} ${item.isCompleted ? 'line-through' : ''}`}
          style={{
            color: item.isCompleted ? 'var(--color-todoloo-text-muted)' : 'var(--color-todoloo-text-secondary)'
          }}
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          {item.description}
        </span>
      )}

      {/* Delete button (shown on hover) */}
      <button
        onClick={() => onDelete(item.id)}
        className={compact
          ? "opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded hover:bg-[var(--color-todoloo-border)]"
          : "opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded hover:bg-[var(--color-todoloo-border)] lg:absolute lg:right-[10px]"
        }
        aria-label="Delete checklist item"
      >
        <X className="w-3.5 h-3.5" style={{ color: 'var(--color-todoloo-text-muted)' }} />
      </button>
    </div>
  )
}

export default function UnifiedChecklistSection({
  items,
  onAddItem,
  onDeleteItem,
  onToggleItem,
  onUpdateItem,
  onReorderItems,
  isEditing = false,
  className = '',
  compact = false
}: UnifiedChecklistSectionProps) {
  const [newItemDescription, setNewItemDescription] = useState('')
  const [isAddingItem, setIsAddingItem] = useState(items.length === 0 && isEditing)
  const [itemIdToEdit, setItemIdToEdit] = useState<string | null>(null)
  const newItemInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Focus input when starting to add an item
  useEffect(() => {
    if (isAddingItem && newItemInputRef.current) {
      newItemInputRef.current.focus()
    }
  }, [isAddingItem])

  const handleAddItem = async () => {
    if (!newItemDescription.trim()) {
      setIsAddingItem(false)
      return
    }

    try {
      await onAddItem(newItemDescription.trim())
      setNewItemDescription('')
      // Keep the input open for adding more items
      if (newItemInputRef.current) {
        newItemInputRef.current.focus()
      }
    } catch (error) {
      console.error('Failed to add checklist item:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddItem()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setNewItemDescription('')
      setIsAddingItem(false)
    } else if (e.key === 'Backspace' && !newItemDescription) {
      // If backspace on empty "Add item" input, close it and focus previous item
      e.preventDefault()
      setIsAddingItem(false)
      if (items.length > 0) {
        const lastItem = items[items.length - 1]
        setItemIdToEdit(lastItem.id)
        setTimeout(() => setItemIdToEdit(null), 0)
      }
    }
  }

  const handleToggle = async (itemId: string) => {
    try {
      await onToggleItem(itemId)
    } catch (error) {
      console.error('Failed to toggle checklist item:', error)
    }
  }

  const handleDelete = async (itemId: string) => {
    try {
      await onDeleteItem(itemId)
    } catch (error) {
      console.error('Failed to delete checklist item:', error)
    }
  }

  const handleUpdate = async (itemId: string, description: string) => {
    try {
      await onUpdateItem(itemId, description)
    } catch (error) {
      console.error('Failed to update checklist item:', error)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      const reorderedItems = arrayMove(items, oldIndex, newIndex)

      // Update order property for each item
      const itemsWithNewOrder = reorderedItems.map((item, index) => ({
        ...item,
        order: index
      }))

      onReorderItems(itemsWithNewOrder)
    }
  }

  const containerClasses = compact
    ? `space-y-0 ${className}`
    : `mt-4 flex flex-col ${className}`

  const addItemContainerClasses = compact
    ? "flex items-center gap-3 py-1 px-0"
    : "flex items-center gap-2 py-2 rounded-lg lg:ml-6"

  const addItemButtonClasses = compact
    ? "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:bg-[var(--color-todoloo-muted)] cursor-pointer w-full"
    : "flex items-center gap-2 py-2 pb-4 rounded-lg transition-colors hover:bg-[var(--color-todoloo-muted)] cursor-pointer w-full lg:ml-6"

  return (
    <div className={containerClasses}>
      {/* Checklist items */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={compact ? "space-y-0" : "space-y-1"}>
            {items.map((item, index) => (
              <SortableChecklistItem
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                shouldStartEditing={itemIdToEdit === item.id}
                compact={compact}
                onDeleteAndFocusPrevious={
                  index > 0
                    ? async () => {
                        const previousItem = items[index - 1]
                        await handleDelete(item.id)
                        // Set the previous item to be edited
                        setItemIdToEdit(previousItem.id)
                        // Reset after a frame to allow re-triggering
                        setTimeout(() => setItemIdToEdit(null), 0)
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add new item - only show when editing */}
      {isEditing && (
        <div style={compact ? {} : { marginTop: '16px' }}>
          {isAddingItem ? (
            <div className={addItemContainerClasses}>
              {/* Spacer for drag handle alignment (non-compact only) */}
              {!compact && <div className="w-[22px] hidden lg:block flex-shrink-0" />}
              <div className="w-5 h-5 rounded border-2 flex-shrink-0" style={{ borderColor: 'var(--color-todoloo-border)' }} />
              <input
                ref={newItemInputRef}
                type="text"
                value={newItemDescription}
                onChange={(e) => {
                  e.stopPropagation() // Prevent space bar from triggering drag
                  setNewItemDescription(e.target.value)
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  // If input is empty, close it
                  if (!newItemDescription.trim()) {
                    setIsAddingItem(false)
                  } else {
                    // Otherwise, add the item
                    handleAddItem()
                  }
                }}
                placeholder="Add item..."
                className="flex-1 text-sm font-['Outfit'] bg-transparent border-none outline-none"
                style={{ color: 'var(--color-todoloo-text-primary)' }}
              />
            </div>
          ) : (
            <button
              onClick={() => setIsAddingItem(true)}
              className={addItemButtonClasses}
            >
              {/* Spacer for drag handle alignment (non-compact only) */}
              {!compact && <div className="w-[22px] hidden lg:block flex-shrink-0" />}
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4" style={{ color: 'var(--color-todoloo-text-muted)' }} />
              </div>
              <span className="text-sm font-['Outfit']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
                Add item
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
