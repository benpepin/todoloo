'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, GripVertical } from 'lucide-react'
import { ChecklistItem } from '@/types'
import { useToDoStore } from '@/store/toDoStore'
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

interface ChecklistSectionProps {
  taskId: string
  checklistItems?: ChecklistItem[]
  isEditing?: boolean
}

interface SortableChecklistItemProps {
  item: ChecklistItem
  onToggle: (id: string) => void
  onUpdate: (id: string, description: string) => void
  onDeleteAndFocusPrevious?: () => void
  onAddNext?: () => void
  shouldStartEditing?: boolean
}

function SortableChecklistItem({ item, onToggle, onUpdate, onDeleteAndFocusPrevious, onAddNext, shouldStartEditing }: SortableChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.description)
  const inputRef = useRef<HTMLInputElement>(null)
  const isSubmittingRef = useRef(false)
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
        onUpdate(item.id, editValue.trim())
        // Don't set isEditing to false - keep the item in view mode
        // Create a new item after this one
        if (onAddNext) {
          onAddNext()
        }
        setTimeout(() => {
          isSubmittingRef.current = false
        }, 100)
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 py-2 rounded-lg transition-colors hover:bg-[var(--color-todoloo-muted)] relative lg:pl-[56px]"
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
        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hidden lg:block flex-shrink-0"
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

export default function ChecklistSection({ taskId, checklistItems = [], isEditing = false }: ChecklistSectionProps) {
  const [itemIdToEdit, setItemIdToEdit] = useState<string | null>(null)
  const [hasCreatedInitialItem, setHasCreatedInitialItem] = useState(false)
  const [needsInitialFocus, setNeedsInitialFocus] = useState(false)

  const addChecklistItem = useToDoStore((state) => state.addChecklistItem)
  const deleteChecklistItem = useToDoStore((state) => state.deleteChecklistItem)
  const toggleChecklistItemCompletion = useToDoStore((state) => state.toggleChecklistItemCompletion)
  const updateChecklistItemOrder = useToDoStore((state) => state.updateChecklistItemOrder)
  const updateChecklistItemField = useToDoStore((state) => state.updateChecklistItemField)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Disable keyboard sensor when clicking/focusing on checklist items
      // Only allow drag with keyboard when explicitly on the drag handle
    })
  )

  // Automatically create first empty item when entering edit mode with no items
  useEffect(() => {
    if (isEditing && checklistItems.length === 0 && !hasCreatedInitialItem) {
      setHasCreatedInitialItem(true)
      setNeedsInitialFocus(true)
      addChecklistItem(taskId, '')
    }
  }, [isEditing, checklistItems.length, hasCreatedInitialItem, addChecklistItem, taskId])

  // Focus the first item when it gets added (after creation)
  useEffect(() => {
    if (needsInitialFocus && checklistItems.length > 0) {
      setNeedsInitialFocus(false)
      const firstItem = checklistItems[0]
      if (firstItem) {
        setItemIdToEdit(firstItem.id)
        setTimeout(() => setItemIdToEdit(null), 0)
      }
    }
  }, [needsInitialFocus, checklistItems])

  // Reset flag when items exist
  useEffect(() => {
    if (checklistItems.length > 0) {
      setHasCreatedInitialItem(false)
    }
  }, [checklistItems.length])

  const handleAddItemAfter = async (currentItemId: string) => {
    try {
      await addChecklistItem(taskId, '')
      // After the new item is created, find it and set it to edit mode
      // The new item will be the last one in the list
      setTimeout(() => {
        if (checklistItems.length > 0) {
          const newItem = checklistItems[checklistItems.length - 1]
          setItemIdToEdit(newItem.id)
          setTimeout(() => setItemIdToEdit(null), 0)
        }
      }, 100)
    } catch (error) {
      console.error('Failed to add checklist item:', error)
    }
  }

  const handleToggle = async (itemId: string) => {
    try {
      await toggleChecklistItemCompletion(itemId)
    } catch (error) {
      console.error('Failed to toggle checklist item:', error)
    }
  }

  const handleDelete = async (itemId: string) => {
    try {
      await deleteChecklistItem(itemId)
    } catch (error) {
      console.error('Failed to delete checklist item:', error)
    }
  }

  const handleUpdate = async (itemId: string, description: string) => {
    try {
      await updateChecklistItemField(itemId, { description })
    } catch (error) {
      console.error('Failed to update checklist item:', error)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = checklistItems.findIndex((item) => item.id === active.id)
      const newIndex = checklistItems.findIndex((item) => item.id === over.id)

      const reorderedItems = arrayMove(checklistItems, oldIndex, newIndex)

      // Update order property for each item
      const itemsWithNewOrder = reorderedItems.map((item, index) => ({
        ...item,
        order: index
      }))

      updateChecklistItemOrder(taskId, itemsWithNewOrder)
    }
  }

  return (
    <div className="mt-4 flex flex-col">
      {/* Checklist items */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={checklistItems.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1">
            {checklistItems.map((item, index) => (
              <SortableChecklistItem
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onUpdate={handleUpdate}
                shouldStartEditing={itemIdToEdit === item.id}
                onAddNext={() => handleAddItemAfter(item.id)}
                onDeleteAndFocusPrevious={
                  index > 0
                    ? async () => {
                        const previousItem = checklistItems[index - 1]
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
    </div>
  )
}
