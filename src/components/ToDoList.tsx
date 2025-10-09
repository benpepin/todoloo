'use client'

import { useEffect } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useToDoStore } from '@/store/toDoStore'
import SortableTaskItem from './SortableTaskItem'
import ToDoCard from './ToDoCard'

function ToDoListContent() {
  const { tasks, activeTaskId, deleteTask, toggleTaskCompletion, updateTaskOrder, showCreateTask, toggleCreateTask } = useToDoStore()

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
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragOver = () => {
    // No special handling needed for simple reordering
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    console.log('[DRAG] Drag ended:', { activeId: active.id, overId: over?.id })

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

      const oldIndex = tasks.findIndex((task) => task.id === active.id)
      const newIndex = tasks.findIndex((task) => task.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Simple reordering - no grouping via drag
        console.log('[DRAG] Reordering tasks')
        const reorderedTasks = arrayMove(tasks, oldIndex, newIndex)
        const updatedTasks = reorderedTasks.map((task, index) => ({
          ...task,
          order: index
        }))
        
        console.log('[DRAG] Updating task order')
        await updateTaskOrder(updatedTasks)
      }
    }
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
              className="px-4 py-2 bg-zinc-100 dark:bg-gray-700 rounded-md shadow-[0px_4px_7px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-gray-600 inline-flex flex-col justify-start items-start gap-2.5 hover:bg-zinc-200 dark:hover:bg-gray-600 transition-colors"
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
  const doneTasks = tasks.filter(task => task.isCompleted).sort((a, b) => a.order - b.order)

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
              className="px-4 py-2 bg-zinc-100 dark:bg-gray-700 rounded-md shadow-[0px_4px_7px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-zinc-300 dark:outline-gray-600 inline-flex flex-col justify-start items-start gap-2.5 hover:bg-zinc-200 dark:hover:bg-gray-600 transition-colors"
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

                  console.log('Task:', task.description, 'groupId:', task.groupId)

                  if (task.groupId) {
                    const groupTasks = todoTasks.filter(t => t.groupId === task.groupId)
                    console.log('Group tasks for', task.description, ':', groupTasks.length)
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
                      console.log('Group position for', task.description, ':', groupPosition)
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
    </DndContext>
  )
}

export default function ToDoList() {
  return <ToDoListContent />
}
