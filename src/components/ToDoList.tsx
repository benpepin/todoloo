'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverlay, DragOverEvent, CollisionDetection, rectIntersection } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AnimatePresence, motion } from 'framer-motion'
import { useToDoStore } from '@/store/toDoStore'
import SortableTaskItem from './SortableTaskItem'
import ToDoCard from './ToDoCard'
import CompletionState from './CompletionState'
import SkeletonLoader from './SkeletonLoader'
import { Check } from 'lucide-react'

function ToDoListContent() {
  const { tasks, deleteTask, toggleTaskCompletion, updateTaskOrder, showCreateTask, toggleCreateTask, moveTaskToList, isLoading, isInitialized } = useToDoStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [overId, setOverId] = useState<string | null>(null)
  const [newlyCreatedTaskId, setNewlyCreatedTaskId] = useState<string | null>(null)

  // Track when creation card closes and first task appears
  const prevTasksLengthRef = useRef(tasks.length)

  useEffect(() => {
    // Detect when a new task is added (task count increased)
    if (tasks.length > prevTasksLengthRef.current) {
      const incompleteTasks = tasks.filter(t => !t.isCompleted).sort((a, b) => a.order - b.order)
      const firstTask = incompleteTasks[0]
      if (firstTask) {
        setNewlyCreatedTaskId(firstTask.id)
        // Clear after animation completes
        setTimeout(() => setNewlyCreatedTaskId(null), 400)
      }
    }
    prevTasksLengthRef.current = tasks.length
  }, [tasks.length])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Block Command+N / Ctrl+N
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        return
      }

      // Only trigger if no input/textarea is focused
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      )

      // Check for just 'n' key (without modifier keys)
      if (!isInputFocused && event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
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
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
    // Keyboard sensor disabled to prevent space bar from triggering drag when typing in checklist items
    // Users can still drag with mouse/touch via the drag handle
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as string || null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setOverId(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    console.log('[DRAG] Drag ended:', { activeId: active.id, overId: over?.id, overData: over?.data })

    // Clear overId immediately but delay clearing activeId for smooth animation
    setOverId(null)

    if (!over) return

    // Check if dropped on a list (sidebar)
    if (over.data?.current?.type === 'list') {
      const taskId = active.id as string
      const targetListId = over.data.current.listId as string

      console.log('[DRAG] Moving task to list:', { taskId, targetListId })

      await moveTaskToList(taskId, targetListId)

      // Clear active ID after animation
      setTimeout(() => setActiveId(null), 200)
      return
    }

    // Otherwise, handle reordering within the same list
    if (active.id !== over?.id) {
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

  // Calculate filtered task lists
  const todoTasks = tasks.filter(task => !task.isCompleted).sort((a, b) => a.order - b.order)
  const doneTasks = tasks.filter(task => task.isCompleted).sort((a, b) => {
    // Sort by completedAt, earliest first (first completed = rank 1)
    if (!a.completedAt && !b.completedAt) return 0
    if (!a.completedAt) return 1
    if (!b.completedAt) return -1
    return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
  })

  // Check if all tasks are completed
  const allTasksComplete = tasks.length > 0 && tasks.every(task => task.isCompleted)

  // Show skeleton during initial load
  if (isLoading && !isInitialized) {
    return (
      <div className="w-full flex flex-col justify-start items-start gap-8">
        {/* Todo Section */}
        <div className="w-full flex flex-col justify-start items-start gap-0 lg:gap-4">
          {/* Section header */}
          <div className="hidden lg:flex w-full justify-start items-center gap-1.5">
            <div className="text-base font-normal font-['Outfit']" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Todos</div>
            <div className="flex-1 h-px transform translate-y-0.5" style={{ backgroundColor: 'var(--color-todoloo-text-secondary)' }} />
          </div>

          {/* Skeleton Cards */}
          <SkeletonLoader count={3} />
        </div>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="w-full flex flex-col justify-start items-start gap-8">
        {/* Todo Section */}
        <div className="w-full flex flex-col justify-start items-start gap-0 lg:gap-4">
          {/* Only show header when there are tasks - hidden on mobile */}
          {todoTasks.length > 0 && (
            <div className="hidden lg:flex w-full justify-start items-center gap-1.5">
              <div className="text-base font-normal font-['Outfit']" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Todos</div>
              <div className="flex-1 h-px transform translate-y-0.5" style={{ backgroundColor: 'var(--color-todoloo-text-secondary)' }} />
            </div>
          )}

          {/* Task Creation Card */}
          <AnimatePresence mode="wait">
            {showCreateTask && <ToDoCard key="todo-card-empty" />}
          </AnimatePresence>

          {/* Enhanced Empty state when no tasks - vertically centered */}
          {!showCreateTask && (
            <div className="w-full h-[calc(100vh-200px)] flex items-center justify-center">
              <div className="w-full max-w-[520px] relative">
                {/* Bunny Ears - top left corner of card with pop-up animation */}
                <div className="absolute left-0 z-0 animate-[slideUp_0.4s_ease-out_0.2s_both]" style={{ top: '-56px' }}>
                  <Image src="/bunnyearsfingers.png" alt="" width={80} height={80} className="object-contain" />
                </div>

                {/* Date in top right corner with fade-in */}
                <div className="absolute -top-8 right-0 z-0 animate-[fadeIn_0.3s_ease-out_0.1s_both]">
                  <div
                    className="text-base font-normal font-['Outfit']"
                    style={{ color: 'var(--color-todoloo-text-secondary)' }}
                  >
                    {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                  </div>
                </div>

                {/* Card with embedded ToDoCard - fade in quickly */}
                <div className="relative z-10 animate-[fadeIn_0.3s_ease-out_both]">
                  <ToDoCard />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show completion state when all tasks are completed
  if (allTasksComplete) {
    return (
      <div className="w-full flex flex-col items-center">
        {/* Task Creation Card overlay */}
        {showCreateTask && (
          <div className="w-full flex flex-col justify-start items-start gap-0 lg:gap-4 mb-8">
            <ToDoCard />
          </div>
        )}
        {/* Completion state - just the task list portion */}
        <CompletionState tasks={tasks} />
      </div>
    )
  }

  // Custom collision detection that prioritizes list drops over task reordering
  const customCollisionDetection: CollisionDetection = (args) => {
    // First, check for rectangle intersection with all droppable areas
    const rectCollisions = rectIntersection(args)

    // Filter for list droppable areas (they have IDs starting with 'list-')
    const listCollisions = rectCollisions.filter((collision) =>
      String(collision.id).startsWith('list-')
    )

    // If we found a list collision, use it (prioritize lists)
    if (listCollisions.length > 0) {
      console.log('[COLLISION] Found list collision:', listCollisions[0].id)
      return listCollisions
    }

    // Otherwise, fall back to standard collision detection for task reordering
    return closestCenter(args)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="w-full flex flex-col justify-start items-start gap-8 pb-8">
        {/* Todo Section */}
        <div className="w-full flex flex-col justify-start items-start gap-0 lg:gap-4">
          <div className="hidden lg:flex w-full justify-start items-center gap-1.5">
            <div className="text-base font-normal font-['Outfit']" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Todos</div>
            <div className="flex-1 h-px transform translate-y-0.5" style={{ backgroundColor: 'var(--color-todoloo-text-secondary)' }} />
          </div>

          {/* Task Creation Card */}
          <AnimatePresence>
            {showCreateTask && <ToDoCard key="todo-card" />}
          </AnimatePresence>

          <div className="w-full flex flex-col justify-start items-start">
            <SortableContext items={todoTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
              <AnimatePresence>
                <div className="w-full flex flex-col">
                  {todoTasks.map((task, index) => {
                  // Determine group position
                  let groupPosition: 'single' | 'first' | 'middle' | 'last' = 'single'

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
                        groupPosition={groupPosition}
                        isNewlyCreated={task.id === newlyCreatedTaskId}
                      />
                    </div>
                  )
                })}
                </div>
              </AnimatePresence>
            </SortableContext>
          </div>
        </div>

        {/* Done Section */}
        {doneTasks.length > 0 && (
          <motion.div
            className="w-full flex flex-col justify-start items-start gap-4"
            layout
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Done header - moves with layout animation */}
            <div className="w-full inline-flex justify-start items-center gap-1.5">
              <div className="text-base font-normal font-['Outfit']" style={{ color: 'var(--color-todoloo-text-secondary)' }}>Done</div>
              <div className="flex-1 h-px transform translate-y-0.5" style={{ backgroundColor: 'var(--color-todoloo-text-secondary)' }} />
            </div>
            <div className="w-full flex flex-col justify-start items-start">
              <SortableContext items={doneTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                <AnimatePresence>
                  <div className="w-full flex flex-col">
                    {doneTasks.map((task, index) => {
                    // Determine group position
                    let groupPosition: 'single' | 'first' | 'middle' | 'last' = 'single'

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
                        className={index === 0 ? '' : 'mt-4'}
                      >
                        <SortableTaskItem
                          task={task}
                          taskIndex={index + 1}
                          onDelete={deleteTask}
                          onToggleCompletion={toggleTaskCompletion}
                          groupPosition={groupPosition}
                        />
                      </div>
                    )
                    })}
                  </div>
                </AnimatePresence>
              </SortableContext>
            </div>
          </motion.div>
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
              <div className="hidden lg:flex items-center justify-center w-8 h-8">
                <span
                  className="font-normal"
                  style={{ color: '#989999', fontSize: 28, fontFamily: 'Outfit' }}
                >
                  {(() => {
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
                       fontFamily: 'Outfit'
                     }}>
                    {(() => {
                      const task = tasks.find(t => t.id === activeId)
                      return task?.description || ''
                    })()}
                  </p>
                  <p className="text-sm font-normal" style={{ color: 'var(--color-todoloo-text-muted)', fontFamily: 'Outfit' }}>
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
