'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Check } from 'lucide-react'
import { Task } from '@/types'

interface SortableTaskItemProps {
  task: Task
  onDelete: (id: string) => void
  onToggleCompletion: (id: string) => void
  isActive: boolean
}

export default function SortableTaskItem({ 
  task, 
  onDelete, 
  onToggleCompletion, 
  isActive 
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`w-[480px] mx-auto bg-[#FEFFFF] rounded-[20px] border border-[#D9D9D9] shadow-[0px_4px_54px_rgba(0,0,0,0.05)] p-4 ${
        isDragging ? 'opacity-60 shadow-lg scale-105' : 'transition-all duration-200'
      } ${isActive ? 'ring-2 ring-[#9F8685]' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => onToggleCompletion(task.id)}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              task.isCompleted
                ? 'bg-[#9F8685] border-[#9F8685] text-white'
                : 'border-[#D9D9D9] hover:border-[#9F8685]'
            }`}
          >
            {task.isCompleted && <Check className="w-3 h-3" />}
          </button>
          
          <div className="flex-1">
            <p className={`text-base font-inter ${
              task.isCompleted ? 'text-[#989999] line-through' : 'text-[#2D1B1B]'
            }`}>
              {task.description}
            </p>
            <p className="text-xs text-[#696969] font-inter mt-1">
              {formatTime(task.estimatedMinutes)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-colors cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <div className="w-4 h-4 flex flex-col gap-0.5">
              <div className="w-full h-0.5 bg-[#696969] rounded"></div>
              <div className="w-full h-0.5 bg-[#696969] rounded"></div>
              <div className="w-full h-0.5 bg-[#696969] rounded"></div>
            </div>
          </button>
          
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-colors text-[#696969] hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
