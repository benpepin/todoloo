'use client'

import { useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useTaskStore } from '@/store/taskStore'
import SortableTaskItem from './SortableTaskItem'
import TaskCard from './TaskCard'
import { useClientOnly } from '@/hooks/useClientOnly'

function TaskListContent() {
  const { tasks, activeTaskId, deleteTask, toggleTaskCompletion, updateTaskOrder, showCreateTask, toggleCreateTask } = useTaskStore()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+N (Mac) or Ctrl+N (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
        event.preventDefault()
        toggleCreateTask()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toggleCreateTask, showCreateTask])

  
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id && over) {
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
      <div className="w-[600px] inline-flex flex-col justify-start items-start gap-16">
        {/* Todo Section */}
        <div className="w-full flex flex-col justify-start items-start gap-4">
          <div className="w-full inline-flex justify-start items-center gap-1.5">
            <div className="text-[#5F5F5F] text-base font-normal font-['Inter']">Todo</div>
            <div className="flex-1 h-px bg-[#D9D9D9] transform translate-y-0.5" />
          </div>
          
          {/* Task Creation Card */}
          {showCreateTask && <TaskCard />}
          
          {/* Empty state when no tasks and not creating */}
          {!showCreateTask && (
            <div className="w-full">
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
          )}
        </div>
      </div>
    )
  }

  const todoTasks = tasks.filter(task => !task.isCompleted).sort((a, b) => a.order - b.order)
  const doneTasks = tasks.filter(task => task.isCompleted).sort((a, b) => a.order - b.order)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="w-[600px] inline-flex flex-col justify-start items-start gap-16">
        {/* Todo Section */}
        <div className="w-full flex flex-col justify-start items-start gap-4">
          <div className="w-full inline-flex justify-start items-center gap-1.5">
            <div className="text-[#5F5F5F] text-base font-normal font-['Inter']">Todo</div>
            <div className="flex-1 h-px bg-[#D9D9D9] transform translate-y-0.5" />
          </div>
          
          {/* Task Creation Card */}
          {showCreateTask && <TaskCard />}
          
          <div className="w-full flex flex-col justify-start items-start">
            <SortableContext items={todoTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {todoTasks.map((task) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    onDelete={deleteTask}
                    onToggleCompletion={toggleTaskCompletion}
                    isTaskActive={activeTaskId === task.id}
                  />
                ))}
              </div>
            </SortableContext>
          </div>
        </div>

        {/* Done Section */}
        {doneTasks.length > 0 && (
          <div className="w-full flex flex-col justify-start items-start gap-4">
            <div className="w-full inline-flex justify-start items-center gap-1.5">
              <div className="text-[#5F5F5F] text-base font-normal font-['Inter']">Done</div>
              <div className="flex-1 h-px bg-[#D9D9D9]" />
            </div>
            <div className="w-full flex flex-col justify-start items-start">
              <SortableContext items={doneTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {doneTasks.map((task) => (
                    <SortableTaskItem
                      key={task.id}
                      task={task}
                      onDelete={deleteTask}
                      onToggleCompletion={toggleTaskCompletion}
                      isTaskActive={activeTaskId === task.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  )
}

export default function TaskList() {
  const isClient = useClientOnly()

  if (!isClient) {
    return (
      <div className="w-[600px] inline-flex flex-col justify-start items-start gap-16">
        <div className="w-full flex flex-col justify-start items-start gap-4">
          <div className="w-full inline-flex justify-start items-center gap-1.5">
            <div className="text-[#5F5F5F] text-base font-normal font-['Inter']">Todo</div>
            <div className="flex-1 h-px bg-[#D9D9D9] transform translate-y-0.5" />
          </div>
          <div className="w-full">
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-28 bg-gray-200 rounded-lg transform -rotate-8 mb-8"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-[#363636] font-inter mb-2">
                  Loading...
                </h3>
                <p className="text-[#717171] font-inter">
                  Initializing your tasks
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <TaskListContent />
}
