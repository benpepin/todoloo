'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Check, GripVertical } from 'lucide-react'
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
  /** Callback when the first item is deleted (to remove the checklist entirely) */
  onDeleteFirstItem?: () => void | Promise<void>
}

interface SortableChecklistItemProps {
  item: ChecklistItem
  onToggle: (id: string) => void
  onUpdate: (id: string, description: string) => void
  onDeleteAndFocusPrevious?: () => void
  onAddNext?: () => void
  shouldStartEditing?: boolean
  compact?: boolean
  innerRef?: React.MutableRefObject<{ getCurrentValue: () => string } | null>
}

function SortableChecklistItem({
  item,
  onToggle,
  onUpdate,
  onDeleteAndFocusPrevious,
  onAddNext,
  shouldStartEditing,
  compact = false,
  innerRef
}: SortableChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.description)
  const inputRef = useRef<HTMLInputElement>(null)
  const isSubmittingRef = useRef(false)

  // Expose getCurrentValue method via ref
  useEffect(() => {
    if (innerRef) {
      innerRef.current = {
        getCurrentValue: () => editValue
      }
    }
  }, [editValue, innerRef])
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

  // Sync editValue with item.description when it changes (but only if not currently editing)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(item.description)
    }
  }, [item.description, isEditing])

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // Position cursor at the end if triggered by shouldStartEditing, otherwise select all
      if (shouldStartEditing) {
        const length = inputRef.current.value.length
        inputRef.current.setSelectionRange(length, length)
      } else {
        inputRef.current.select()
      }
    }
  }, [isEditing, shouldStartEditing])

  // Handle shouldStartEditing prop
  useEffect(() => {
    if (shouldStartEditing && !isEditing) {
      console.log('shouldStartEditing triggered for item:', item.id, item.description)
      setIsEditing(true)
    }
  }, [shouldStartEditing, isEditing])

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdate(item.id, editValue.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, onAddNext?: () => void) => {
    e.stopPropagation() // Prevent all key events from bubbling
    if (e.key === 'Enter') {
      e.preventDefault()

      // Only create next item if current item has content
      if (editValue.trim()) {
        isSubmittingRef.current = true
        // Update the current item
        onUpdate(item.id, editValue.trim())
        // Create a new item after this one - the new item will steal focus
        if (onAddNext) {
          onAddNext()
        }
        // Reset the submitting flag after new item is created
        setTimeout(() => {
          isSubmittingRef.current = false
        }, 150)
      }
      // If empty, do nothing (stay in editing mode)
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
    : "group flex items-center gap-2 py-2 rounded-lg transition-colors hover:bg-[var(--color-todoloo-muted)] relative lg:pl-[56px]"

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
          onKeyDown={(e) => handleKeyDown(e, onAddNext)}
          onBlur={() => {
            if (!isSubmittingRef.current) {
              handleSave()
            }
          }}
          placeholder="Add todo"
          className="flex-1 text-sm font-['Outfit'] bg-transparent border-none outline-none"
          style={{
            color: 'var(--color-todoloo-text-secondary)'
          }}
        />
      ) : (
        <span
          className={`flex-1 text-sm font-['Outfit'] cursor-text ${item.isCompleted ? 'line-through' : ''}`}
          style={{
            color: item.isCompleted ? 'var(--color-todoloo-text-muted)' : (item.description ? 'var(--color-todoloo-text-secondary)' : 'var(--color-todoloo-text-muted)')
          }}
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          {item.description || 'Add todo'}
        </span>
      )}

      {/* Drag Handle - only visible on hover, positioned on the right */}
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
    </div>
  )
}

const UnifiedChecklistSection = forwardRef<{ saveAllItems: () => Promise<ChecklistItem[]> }, UnifiedChecklistSectionProps>(({
  items,
  onAddItem,
  onDeleteItem,
  onToggleItem,
  onUpdateItem,
  onReorderItems,
  isEditing = false,
  className = '',
  compact = false,
  onDeleteFirstItem
}, ref) => {
  const [itemIdToEdit, setItemIdToEdit] = useState<string | null>(null)
  const [hasCreatedInitialItem, setHasCreatedInitialItem] = useState(false)
  const [needsInitialFocus, setNeedsInitialFocus] = useState(false)
  const [pendingItemCount, setPendingItemCount] = useState<number | null>(null)
  const itemRefsMap = useRef<Map<string, React.MutableRefObject<{ getCurrentValue: () => string } | null>>>(new Map())

  // Expose saveAllItems method to parent via ref
  useImperativeHandle(ref, () => ({
    saveAllItems: async () => {
      console.log('saveAllItems called, items.length:', items.length)
      const savePromises: Promise<void>[] = []
      const updatedItems: ChecklistItem[] = []

      items.forEach(item => {
        const itemRef = itemRefsMap.current.get(item.id)
        if (itemRef?.current) {
          const currentValue = itemRef.current.getCurrentValue()
          console.log('Saving item:', item.id, 'currentValue:', currentValue, 'item.description:', item.description)

          // Always add the item with the current value
          updatedItems.push({
            ...item,
            description: currentValue.trim() || item.description
          })

          // Only call onUpdateItem if the value changed
          if (currentValue.trim() && currentValue !== item.description) {
            const promise = Promise.resolve(onUpdateItem(item.id, currentValue.trim()))
            savePromises.push(promise)
          }
        } else {
          // No ref, use the existing item
          updatedItems.push(item)
        }
      })

      await Promise.all(savePromises)
      console.log('All items saved, returning:', updatedItems)
      return updatedItems
    }
  }), [items, onUpdateItem])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Automatically create first empty item when entering edit mode with no items
  useEffect(() => {
    if (isEditing && items.length === 0 && !hasCreatedInitialItem) {
      setHasCreatedInitialItem(true)
      setNeedsInitialFocus(true)
      onAddItem('')
    }
  }, [isEditing, items.length, hasCreatedInitialItem, onAddItem])

  // Focus the first item when it gets added (after creation)
  useEffect(() => {
    if (needsInitialFocus && items.length > 0) {
      setNeedsInitialFocus(false)
      const firstItem = items[0]
      if (firstItem) {
        setItemIdToEdit(firstItem.id)
        // Don't reset itemIdToEdit immediately - let the separate cleanup effect handle it
      }
    }
  }, [needsInitialFocus, items])

  // Reset flag when items exist
  useEffect(() => {
    if (items.length > 0) {
      setHasCreatedInitialItem(false)
    }
  }, [items.length])

  // Focus the newly added item when items array changes
  useEffect(() => {
    if (pendingItemCount !== null && items.length > pendingItemCount) {
      const newItem = items[items.length - 1]
      console.log('New item detected, setting itemIdToEdit:', newItem.id)
      setItemIdToEdit(newItem.id)
      // Don't reset itemIdToEdit immediately - let the item stay in editing mode
      setPendingItemCount(null)
    }
  }, [items.length, pendingItemCount, items])

  // Reset itemIdToEdit when it's been set (to allow re-triggering)
  useEffect(() => {
    if (itemIdToEdit !== null) {
      const timer = setTimeout(() => setItemIdToEdit(null), 100)
      return () => clearTimeout(timer)
    }
  }, [itemIdToEdit])

  const handleAddItemAfter = async (currentItemId: string) => {
    try {
      console.log('handleAddItemAfter called, current items.length:', items.length)
      setPendingItemCount(items.length)
      await onAddItem('')
      console.log('onAddItem completed, new items.length:', items.length)
    } catch (error) {
      console.error('Failed to add checklist item:', error)
      setPendingItemCount(null)
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
            {items.map((item, index) => {
              // Create or get ref for this item
              if (!itemRefsMap.current.has(item.id)) {
                itemRefsMap.current.set(item.id, { current: null })
              }
              const itemRef = itemRefsMap.current.get(item.id)!

              return (
                <SortableChecklistItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  shouldStartEditing={itemIdToEdit === item.id}
                  compact={compact}
                  innerRef={itemRef}
                  onAddNext={() => handleAddItemAfter(item.id)}
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
                      : index === 0 && onDeleteFirstItem
                      ? async () => {
                          // First item - remove the entire checklist
                          await onDeleteFirstItem()
                        }
                      : undefined
                  }
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
})

UnifiedChecklistSection.displayName = 'UnifiedChecklistSection'

export default UnifiedChecklistSection
