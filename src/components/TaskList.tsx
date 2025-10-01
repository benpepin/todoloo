'use client'

import { useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTaskStore } from '@/store/taskStore'
import SortableTaskItem from './SortableTaskItem'


export default function TaskList() {
  const { tasks, activeTaskId, deleteTask, toggleTaskCompletion, updateTaskOrder } = useTaskStore()
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: any) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id)
      const newIndex = tasks.findIndex((task) => task.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTasks = arrayMove(tasks, oldIndex, newIndex)
        
        // Update the order property for each task
        const updatedTasks = reorderedTasks.map((task, index) => ({
          ...task,
          order: index
        }))
        
        updateTaskOrder(updatedTasks)
      }
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="w-[480px] mx-auto">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-28 bg-gray-200 rounded-lg transform -rotate-8 mb-8"></div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-[#363636] font-inter mb-2">
              No tasks yet
            </h3>
            <p className="text-[#717171] font-inter">
              Add your first task above to get started
            </p>
          </div>
        </div>
      </div>
    )
  }

  const sortedTasks = tasks.sort((a, b) => a.order - b.order)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {sortedTasks.map((task) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onToggleCompletion={toggleTaskCompletion}
              isActive={activeTaskId === task.id}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
