'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, X, Plus, GripVertical } from 'lucide-react'
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
  onDelete: (id: string) => void
  onUpdate: (id: string, description: string) => void
}

function SortableChecklistItem({ item, onToggle, onDelete, onUpdate }: SortableChecklistItemProps) {
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
    }
  }, [isEditing])

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
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-[var(--color-todoloo-muted)]"
      tabIndex={-1}
      onKeyDown={(e) => {
        // Stop keyboard events from bubbling to parent task
        e.stopPropagation()
      }}
    >
      {/* Drag Handle */}
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
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
          className="flex-1 text-sm font-['Outfit'] bg-transparent border-none outline-none"
          style={{
            color: 'var(--color-todoloo-text-secondary)'
          }}
        />
      ) : (
        <span
          className={`flex-1 text-sm font-['Outfit'] cursor-text ${item.isCompleted ? 'line-through' : ''}`}
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
        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 rounded hover:bg-[var(--color-todoloo-border)]"
        aria-label="Delete checklist item"
      >
        <X className="w-3.5 h-3.5" style={{ color: 'var(--color-todoloo-text-muted)' }} />
      </button>
    </div>
  )
}

export default function ChecklistSection({ taskId, checklistItems = [], isEditing = false }: ChecklistSectionProps) {
  const [newItemDescription, setNewItemDescription] = useState('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const newItemInputRef = useRef<HTMLInputElement>(null)

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
      await addChecklistItem(taskId, newItemDescription.trim())
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
    <div className="mt-4 space-y-2">
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
            {checklistItems.map((item) => (
              <SortableChecklistItem
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add new item - only show when editing */}
      {isEditing && (
        isAddingItem ? (
          <div className="flex items-center gap-3 py-2 px-3">
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
            className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors hover:bg-[var(--color-todoloo-muted)] cursor-pointer w-full"
          >
            <Plus className="w-4 h-4" style={{ color: 'var(--color-todoloo-text-muted)' }} />
            <span className="text-sm font-['Outfit']" style={{ color: 'var(--color-todoloo-text-muted)' }}>
              Add item
            </span>
          </button>
        )
      )}
    </div>
  )
}
