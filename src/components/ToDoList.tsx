'use client'

import { useEffect, useState } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, DragOverEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useToDoStore } from '@/store/toDoStore'
import SortableTaskItem from './SortableTaskItem'
import ToDoCard from './ToDoCard'
import { Check } from 'lucide-react'

function ToDoListContent() {
  const { tasks, activeTaskId, deleteTask, toggleTaskCompletion, updateTaskOrder, showCreateTask, toggleCreateTask } = useToDoStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if no input/textarea is focused
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      )

      // Check for Cmd+N (Mac) or Ctrl+N (Windows/Linux) or just 'n'
      if (((event.metaKey || event.ctrlKey) && event.key === 'n') ||
          (!isInputFocused && event.key.toLowerCase() === 'n')) {
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
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    console.log('[DRAG] Drag ended:', { activeId: active.id, overId: over?.id })

    // Clear overId immediately but delay clearing activeId for smooth animation
    setOverId(null)

    if (active.id !== over?.id && over) {
      const draggedTask = tasks.find(t => t.id === active.id)
      const targetTask = tasks.find(t => t.id === over.id)

      console.log('[DRAG] Found tasks:', {
        draggedTask: draggedTask?.description,
        targetTask: targetTask?.description,
        draggedCompleted: draggedTask?.isCompleted,
        targetCompleted: targetTask?.isCompleted
      })

      // Only work with incomplete tasks
      if (!draggedTask || draggedTask.isCompleted || !targetTask || targetTask.isCompleted) {
        console.log('[DRAG] Skipping - completed task or not found')
        return
      }

      // Get incomplete tasks only for reordering
      const incompleteTasks = tasks.filter(task => !task.isCompleted).sort((a, b) => a.order - b.order)
      const oldIndex = incompleteTasks.findIndex((task) => task.id === active.id)
      const newIndex = incompleteTasks.findIndex((task) => task.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Reorder only the incomplete tasks
        console.log('[DRAG] Reordering incomplete tasks')
        const reorderedIncompleteTasks = arrayMove(incompleteTasks, oldIndex, newIndex)
        
        // Create updated tasks array with new order values for incomplete tasks only
        const updatedTasks = tasks.map(task => {
          if (task.isCompleted) {
            // Keep completed tasks as-is
            return task
          } else {
            // Find the new position in the reordered incomplete tasks
            const newPosition = reorderedIncompleteTasks.findIndex(t => t.id === task.id)
            if (newPosition === -1) {
              // Task not found in reordered list, keep original order
              console.warn('[DRAG] Task not found in reordered list:', task.id)
              return task
            }
            return {
              ...task,
              order: newPosition
            }
          }
        })

        // Update store directly - it will handle optimistic updates
        await updateTaskOrder(updatedTasks)
      }
    }
    
    // Clear activeId after a short delay to allow smooth animation
    setTimeout(() => {
      setActiveId(null)
    }, 150)
  }


  if (tasks.length === 0) {
    return (
      <div className="w-full flex flex-col justify-start items-start gap-8">
        {/* Todo Section */}
        <div className="w-full flex flex-col justify-start items-start gap-4">
          <div className="w-full inline-flex justify-start items-center gap-1.5">
            <div className="text-base font-normal font-['Geist']" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Todos</div>
            <div className="flex-1 h-px transform translate-y-0.5" style={{ backgroundColor: 'var(--color-todoloo-text-secondary)' }} />
            <button
              onClick={toggleCreateTask}
              className="px-4 py-2 bg-zinc-100 dark:bg-[#2a2a2a] rounded-md shadow-[0px_4px_7px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-[#404040] inline-flex flex-col justify-start items-start gap-2.5 hover:bg-zinc-200 dark:hover:bg-[#333333] transition-colors"
            >
              <div className="inline-flex justify-center items-center gap-2.5 cursor-pointer">
                <div className="justify-start text-neutral-800 dark:text-gray-200 text-sm font-medium font-['Inter']">New Todo (n)</div>
              </div>
            </button>
          </div>

          {/* Task Creation Card */}
          {showCreateTask && <ToDoCard />}

          {/* Empty state when no tasks and not creating */}
          {!showCreateTask && (
            <div className="w-full">
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-28 bg-gray-200 rounded-lg transform -rotate-8 mb-8"></div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold font-inter mb-2" style={{ color: 'var(--color-todoloo-text-primary)' }}>
                    No to dos yet
                  </h3>
                  <p className="font-inter" style={{ color: 'var(--color-todoloo-text-secondary)' }}>
                    Add your first to do above to get started
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
  const doneTasks = tasks.filter(task => task.isCompleted).sort((a, b) => {
    // Sort by completedAt, earliest first (first completed = rank 1)
    if (!a.completedAt && !b.completedAt) return 0
    if (!a.completedAt) return 1
    if (!b.completedAt) return -1
    return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  })

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full flex flex-col justify-start items-start gap-8">
        {/* Todo Section */}
        <div className="w-full flex flex-col justify-start items-start gap-4">
          <div className="w-full inline-flex justify-start items-center gap-1.5">
            <div className="text-base font-normal font-['Geist']" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Todos</div>
            <div className="flex-1 h-px transform translate-y-0.5" style={{ backgroundColor: 'var(--color-todoloo-text-secondary)' }} />
            <button
              onClick={toggleCreateTask}
              className="px-4 py-2 bg-zinc-100 dark:bg-[#2a2a2a] rounded-md shadow-[0px_4px_7px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-[#404040] inline-flex flex-col justify-start items-start gap-2.5 hover:bg-zinc-200 dark:hover:bg-[#333333] transition-colors"
            >
              <div className="inline-flex justify-center items-center gap-2.5 cursor-pointer">
                <div className="justify-start text-neutral-800 dark:text-gray-200 text-sm font-medium font-['Inter']">New Todo (n)</div>
              </div>
            </button>
          </div>

          {/* Task Creation Card */}
          {showCreateTask && <ToDoCard />}

          <div className="w-full flex flex-col justify-start items-start">
            <SortableContext items={todoTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              <div className="w-full flex flex-col">
                {todoTasks.map((task, index) => {
                  // Determine group position
                  let groupPosition: 'single' | 'first' | 'middle' | 'last' = 'single'
                  const prevTask = index > 0 ? todoTasks[index - 1] : null
                  const isPartOfPreviousGroup = prevTask && task.groupId && prevTask.groupId === task.groupId

                  if (task.groupId) {
                    const groupTasks = todoTasks.filter(t => t.groupId === task.groupId)
                    if (groupTasks.length > 1) {
                      // Find the position within the actual list order, not just within the group
                      const groupTaskIndices = groupTasks.map(t => todoTasks.findIndex(task => task.id === t.id)).sort((a, b) => a - b)
                      const currentTaskIndex = todoTasks.findIndex(t => t.id === task.id)
                      const positionInGroup = groupTaskIndices.indexOf(currentTaskIndex)

                      if (positionInGroup === 0) {
                        groupPosition = 'first'
                      } else if (positionInGroup === groupTaskIndices.length - 1) {
                        groupPosition = 'last'
                      } else {
                        groupPosition = 'middle'
                      }
                    }
                  }

                  return (
                    <div key={task.id} className={index === 0 ? '' : 'mt-4'}>
                      <SortableTaskItem
                        task={task}
                        taskIndex={index + 1}
                        onDelete={deleteTask}
                        onToggleCompletion={toggleTaskCompletion}
                        isTaskActive={activeTaskId === task.id}
                        groupPosition={groupPosition}
                      />
                    </div>
                  )
                })}
              </div>
            </SortableContext>
          </div>
        </div>

        {/* Done Section */}
        {doneTasks.length > 0 && (
          <div className="w-full flex flex-col justify-start items-start gap-4">
            <div className="w-full inline-flex justify-start items-center gap-1.5">
              <div className="text-base font-normal font-['Geist']" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Done</div>
              <div className="flex-1 h-px transform translate-y-0.5" style={{ backgroundColor: 'var(--color-todoloo-text-secondary)' }} />
            </div>
            <div className="w-full flex flex-col justify-start items-start">
              <SortableContext items={doneTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                <div className="w-full flex flex-col">
                  {doneTasks.map((task, index) => {
                    // Determine group position
                    let groupPosition: 'single' | 'first' | 'middle' | 'last' = 'single'
                    const prevTask = index > 0 ? doneTasks[index - 1] : null
                    const isPartOfPreviousGroup = prevTask && task.groupId && prevTask.groupId === task.groupId

                    if (task.groupId) {
                      const groupTasks = doneTasks.filter(t => t.groupId === task.groupId)
                      if (groupTasks.length > 1) {
                        const taskIndexInGroup = groupTasks.findIndex(t => t.id === task.id)
                        if (taskIndexInGroup === 0) {
                          groupPosition = 'first'
                        } else if (taskIndexInGroup === groupTasks.length - 1) {
                          groupPosition = 'last'
                        } else {
                          groupPosition = 'middle'
                        }
                      }
                    }

                    return (
                      <div
                        key={task.id}
                        className={isPartOfPreviousGroup ? '' : (index === 0 ? '' : 'mt-4')}
                        style={isPartOfPreviousGroup ? { marginTop: '1px' } : undefined}
                      >
                        <SortableTaskItem
                          task={task}
                          taskIndex={index + 1}
                          onDelete={deleteTask}
                          onToggleCompletion={toggleTaskCompletion}
                        isTaskActive={activeTaskId === task.id}
                        groupPosition={groupPosition}
                        />
                      </div>
                    )
                  })}
                </div>
              </SortableContext>
            </div>
          </div>
        )}
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="w-full max-w-[460px] rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.25)] p-6"
               style={{
                 backgroundColor: 'var(--color-todoloo-card)',
                 opacity: 1.0,
                 transform: 'scale(1.08) rotate(2deg)',
                 transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease-out',
                 cursor: 'grabbing'
               }}>
            <div className="flex items-center gap-6">
              <div className="flex items-center justify-center w-8 h-8">
                <span
                  className="font-normal"
                  style={{ color: '#989999', fontSize: 28, fontFamily: 'Inter' }}
                >
                  {(() => {
                    const task = tasks.find(t => t.id === activeId)
                    const index = todoTasks.findIndex(t => t.id === activeId)
                    return index + 1
                  })()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex flex-col gap-1">
                  <p className="text-base font-medium"
                     style={{
                       color: 'var(--color-todoloo-text-secondary)',
                       fontFamily: 'Geist'
                     }}>
                    {(() => {
                      const task = tasks.find(t => t.id === activeId)
                      return task?.description || ''
                    })()}
                  </p>
                  <p className="text-sm font-normal" style={{ color: 'var(--color-todoloo-text-muted)', fontFamily: 'Geist' }}>
                    {(() => {
                      const task = tasks.find(t => t.id === activeId)
                      if (!task) return ''
                      const formatEstimatedTime = (minutes: number) => {
                        if (minutes < 60) {
                          return `${minutes} minute${minutes !== 1 ? 's' : ''}`
                        }
                        const hours = Math.floor(minutes / 60)
                        const remainingMinutes = minutes % 60
                        return remainingMinutes > 0 ? `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes}m` : `${hours} hour${hours !== 1 ? 's' : ''}`
                      }
                      return task.isCompleted && task.actualMinutes
                        ? formatEstimatedTime(task.actualMinutes)
                        : formatEstimatedTime(task.estimatedMinutes)
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center" style={{ width: 56, height: 56 }}>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  (() => {
                    const task = tasks.find(t => t.id === activeId)
                    return task?.isCompleted
                      ? ''
                      : 'bg-[#F9F9FD] dark:bg-[#2a2a2a] border-[#E8E6E6] dark:border-[#404040]'
                  })()
                }`}
                     style={{
                       backgroundColor: (() => {
                         const task = tasks.find(t => t.id === activeId)
                         return task?.isCompleted ? 'var(--color-todoloo-gradient-start)' : undefined
                       })(),
                       borderColor: (() => {
                         const task = tasks.find(t => t.id === activeId)
                         return task?.isCompleted ? 'var(--color-todoloo-gradient-start)' : undefined
                       })(),
                       color: (() => {
                         const task = tasks.find(t => t.id === activeId)
                         return task?.isCompleted ? 'white' : 'var(--color-todoloo-text-primary)'
                       })()
                     }}>
                  {(() => {
                    const task = tasks.find(t => t.id === activeId)
                    return task?.isCompleted && (
                      <Check className="w-4 h-4" />
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default function ToDoList() {
  return <ToDoListContent />
}
