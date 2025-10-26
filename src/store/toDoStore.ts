import { create } from 'zustand'
import { Task, AppState, ChecklistItem } from '@/types'
import { useHistoryStore } from './historyStore'
import {
  fetchTodos,
  fetchTodosDirect,
  createTodo,
  updateTodo,
  deleteTodo,
  completeTodo,
  updateTaskOrder as updateTaskOrderDb,
  backfillUserData
} from '@/lib/db'
import {
  fetchChecklistItems,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  toggleChecklistItemCompletion,
  updateChecklistItemOrder
} from '@/lib/checklistDb'

// Inspirational quotes for empty state
const INSPIRATIONAL_QUOTES = [
  "Good luck today!",
  "You've got this!",
  "Make today count!",
  "One step at a time!",
  "Today is your day!",
  "Let's make it happen!",
  "You're doing great!"
]

interface ToDoStore extends AppState {
  isLoading: boolean
  error: string | null
  userId: string | null
  isInitialized: boolean
  currentListOwnerId: string | null // Track which list we're viewing (for shared lists)
  quoteIndex: number

  // Async methods for Supabase operations
  initializeUser: (userId: string) => Promise<void>
  loadTasks: () => Promise<void>
  switchToList: (listOwnerId: string) => Promise<void>
  addTask: (description: string, estimatedMinutes: number, groupId?: string) => Promise<Task | undefined>
  deleteTask: (id: string) => Promise<void>
  toggleTaskCompletion: (id: string) => Promise<void>
  updateTaskOrder: (tasks: Task[]) => Promise<void>
  updateTaskField: (id: string, updates: Partial<Task>, errorMessage?: string) => Promise<void>
  updateTaskActualTime: (id: string, actualMinutes: number) => Promise<void>
  updateTaskDescription: (id: string, description: string) => Promise<void>
  updateTaskEstimatedTime: (id: string, estimatedMinutes: number) => Promise<void>
  saveCurrentEditingTask: (description: string, estimatedMinutes: number) => Promise<void>
  groupTasks: (taskId: string, targetTaskId: string) => Promise<void>
  ungroupTask: (taskId: string) => Promise<void>

  // Checklist methods
  loadChecklistItems: (taskId: string) => Promise<void>
  addChecklistItem: (taskId: string, description: string) => Promise<void>
  updateChecklistItemField: (id: string, updates: Partial<ChecklistItem>) => Promise<void>
  deleteChecklistItem: (id: string) => Promise<void>
  toggleChecklistItemCompletion: (id: string) => Promise<void>
  updateChecklistItemOrder: (taskId: string, items: ChecklistItem[]) => Promise<void>

  // Sync methods for UI state
  startTask: (id: string) => void
  stopTask: () => void
  pauseTask: () => void
  resumeTask: () => void
  setEditingTask: (id: string | null) => void
  clearEditingTask: () => void
  showCreateTask: boolean
  setShowCreateTask: (show: boolean) => void
  toggleCreateTask: () => void
  clearError: () => void
  clearAllTasks: () => void
  getInspirationalQuote: () => string
  cycleQuote: () => void
}

export const useToDoStore = create<ToDoStore>()((set, get) => ({
  // State
  tasks: [],
  activeTaskId: null,
  isTrackingMode: false,
  editingTaskId: null,
  showCreateTask: false,
  isLoading: false,
  error: null,
  userId: null,
  isInitialized: false,
  currentListOwnerId: null,
  quoteIndex: 0,

  // Initialize user and backfill data
  initializeUser: async (userId: string) => {
    try {
      set({ isLoading: true, error: null, userId })

      // Backfill existing data to this user
      await backfillUserData(userId)

      // Load tasks for this user
      const tasks = await fetchTodos(userId)

      // Load checklist items for each task
      const tasksWithChecklists = await Promise.all(
        tasks.map(async (task) => {
          try {
            const checklistItems = await fetchChecklistItems(task.id)
            return { ...task, checklistItems }
          } catch (error) {
            console.error(`Failed to load checklist items for task ${task.id}:`, error)
            return task
          }
        })
      )

      set({
        tasks: tasksWithChecklists,
        isLoading: false,
        isInitialized: true
      })
    } catch (error) {
      console.error('Error initializing user:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize user',
        isLoading: false
      })
    }
  },

  // Load tasks from Supabase
  loadTasks: async () => {
    const { userId, currentListOwnerId } = get()
    if (!userId) {
      set({ error: 'User not authenticated' })
      return
    }

    try {
      set({ isLoading: true, error: null })

      // Use currentListOwnerId if set, otherwise use userId (your own list)
      const targetUserId = currentListOwnerId || userId

      // Use the more robust fetch function for shared lists
      const tasks = await fetchTodosDirect(targetUserId)

      // Load checklist items for each task
      const tasksWithChecklists = await Promise.all(
        tasks.map(async (task) => {
          try {
            const checklistItems = await fetchChecklistItems(task.id)
            return { ...task, checklistItems }
          } catch (error) {
            console.error(`Failed to load checklist items for task ${task.id}:`, error)
            return task
          }
        })
      )

      // Update currentListOwnerId if it wasn't set before
      if (!currentListOwnerId) {
        // Determine if we're viewing a shared list
        // If we have tasks and they all belong to someone else, we're viewing their shared list
        let newCurrentListOwnerId = userId
        if (tasksWithChecklists.length > 0 && tasksWithChecklists[0].userId && tasksWithChecklists[0].userId !== userId) {
          // We're viewing someone else's shared list
          newCurrentListOwnerId = tasksWithChecklists[0].userId
        }
        set({ tasks: tasksWithChecklists, isLoading: false, currentListOwnerId: newCurrentListOwnerId })
      } else {
        set({ tasks: tasksWithChecklists, isLoading: false })
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to load tasks',
        isLoading: false
      })
    }
  },

  // Switch to a different list (your own or a shared list)
  switchToList: async (listOwnerId: string) => {
    const { userId } = get()
    if (!userId) {
      set({ error: 'User not authenticated' })
      return
    }

    try {
      set({ isLoading: true, error: null, currentListOwnerId: listOwnerId })
      const tasks = await fetchTodosDirect(listOwnerId)

      // Load checklist items for each task
      const tasksWithChecklists = await Promise.all(
        tasks.map(async (task) => {
          try {
            const checklistItems = await fetchChecklistItems(task.id)
            return { ...task, checklistItems }
          } catch (error) {
            console.error(`Failed to load checklist items for task ${task.id}:`, error)
            return task
          }
        })
      )

      set({ tasks: tasksWithChecklists, isLoading: false })
    } catch (error) {
      console.error('Error switching list:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to switch list',
        isLoading: false
      })
    }
  },

  // Add new task with optimistic update
  addTask: async (description: string, estimatedMinutes: number, groupId?: string) => {
    const { userId, currentListOwnerId } = get()
    if (!userId) {
      set({ error: 'User not authenticated' })
      return undefined
    }

    // Use currentListOwnerId to create task in the right list
    // If viewing a shared list, create task for that list owner
    const targetUserId = currentListOwnerId || userId

    // If adding to a group, find the last task in that group and insert after it
    let insertIndex = 0
    let orderValue = 0

    if (groupId) {
      const tasks = get().tasks
      const groupTasks = tasks.filter(t => t.groupId === groupId)
      if (groupTasks.length > 0) {
        // Find the last task in the group
        const lastGroupTask = groupTasks[groupTasks.length - 1]
        insertIndex = tasks.findIndex(t => t.id === lastGroupTask.id) + 1
        orderValue = lastGroupTask.order + 1
      } else {
        // First task in the group - add at top
        orderValue = 0
      }
    } else {
      // Not in a group - add at top as before
      orderValue = 0
    }

    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      description,
      estimatedMinutes,
      actualMinutes: 0,
      isCompleted: false,
      isActive: false,
      createdAt: new Date(),
      order: orderValue,
      userId: targetUserId,
      groupId,
      createdByUserId: userId // The current logged-in user is the creator
    }

    // Optimistic update
    set((state) => {
      const newTasks = [...state.tasks]

      if (groupId && insertIndex > 0) {
        // Insert after the last task in the group
        newTasks.splice(insertIndex, 0, optimisticTask)
        // Update order for tasks after the insertion point
        for (let i = insertIndex + 1; i < newTasks.length; i++) {
          newTasks[i] = { ...newTasks[i], order: newTasks[i].order + 1 }
        }
      } else {
        // Add at top (default behavior for non-grouped or first task in group)
        newTasks.unshift(optimisticTask)
        // Update order for all other tasks
        for (let i = 1; i < newTasks.length; i++) {
          newTasks[i] = { ...newTasks[i], order: newTasks[i].order + 1 }
        }
      }

      return { tasks: newTasks }
    })

    try {
      set({ error: null })
      const newTask = await createTodo({
        description,
        estimatedMinutes,
        actualMinutes: 0,
        isCompleted: false,
        isActive: false,
        groupId
      }, targetUserId, userId) // Pass current user ID as creator

      // Replace optimistic task with real one
      set((state) => ({
        tasks: state.tasks.map(task =>
          task.id === optimisticTask.id ? { ...newTask, order: optimisticTask.order } : task
        )
      }))

      // Load checklist items for the newly created task
      try {
        const checklistItems = await fetchChecklistItems(newTask.id)
        set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === newTask.id ? { ...task, checklistItems } : task
          )
        }))
      } catch (error) {
        console.error(`Failed to load checklist items for new task ${newTask.id}:`, error)
      }

      return newTask
    } catch (error) {
      console.error('Error creating task:', error)
      // Remove optimistic task on failure
      set((state) => ({
        tasks: state.tasks.filter(task => task.id !== optimisticTask.id),
        error: error instanceof Error ? error.message : 'Failed to create task'
      }))
      return undefined
    }
  },

  // Delete task with optimistic update
  deleteTask: async (id: string) => {
    const taskToDelete = get().tasks.find(task => task.id === id)
    if (!taskToDelete) return

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
    }))

    try {
      set({ error: null })
      await deleteTodo(id)
    } catch (error) {
      console.error('Error deleting task:', error)
      // Restore task on failure
      set((state) => ({
        tasks: [...state.tasks, taskToDelete].sort((a, b) => a.order - b.order),
        error: error instanceof Error ? error.message : 'Failed to delete task'
      }))
    }
  },

  // Toggle task completion with optimistic update
  toggleTaskCompletion: async (id: string) => {
    const { userId } = get()
    if (!userId) {
      set({ error: 'User not authenticated' })
      return
    }

    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    
    const isCompleting = !task.isCompleted
    
    // Optimistic update
    const updatedTasks = get().tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            isCompleted: !task.isCompleted,
            completedAt: !task.isCompleted ? new Date() : undefined,
          }
        : task
    )
    set({ tasks: updatedTasks })
    
    try {
      set({ error: null })
      
      if (isCompleting) {
        // Complete the task and record duration
        const duration = task.actualMinutes ?? task.estimatedMinutes
        await completeTodo(id, duration, task, userId)
        
        // Add to history store
        const { addEntry } = useHistoryStore.getState()
        addEntry({
          normalizedDescription: task.description.toLowerCase().trim(),
          originalDescription: task.description,
          estimatedMinutes: task.estimatedMinutes,
          actualMinutes: duration,
          completedAt: new Date()
        })
      } else {
        // Uncomplete the task
        await updateTodo(id, { 
          isCompleted: false, 
          completedAt: undefined,
          actualMinutes: undefined 
        })
      }
    } catch (error) {
      console.error('Error toggling task completion:', error)
      // Revert optimistic update
      set({ 
        tasks: get().tasks.map(t => t.id === id ? task : t),
        error: error instanceof Error ? error.message : 'Failed to update task'
      })
    }
  },

  // Update task order with optimistic update
  updateTaskOrder: async (tasks: Task[]) => {
    const originalTasks = get().tasks
    
    // Optimistic update
    set({ tasks })
    
    try {
      set({ error: null })
      await updateTaskOrderDb(tasks)
    } catch (error) {
      console.error('Error updating task order:', error)
      // Revert optimistic update
      set({ 
        tasks: originalTasks,
        error: error instanceof Error ? error.message : 'Failed to update task order'
      })
    }
  },

  // Generic method to update task fields with optimistic updates
  updateTaskField: async (id: string, updates: Partial<Task>, errorMessage: string = 'Failed to update task') => {
    const originalTask = get().tasks.find(task => task.id === id)
    if (!originalTask) return

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    }))

    try {
      set({ error: null })
      await updateTodo(id, updates)
    } catch (error) {
      console.error(`Error updating task:`, error)
      // Revert optimistic update
      set((state) => ({
        tasks: state.tasks.map(task =>
          task.id === id ? originalTask : task
        ),
        error: error instanceof Error ? error.message : errorMessage
      }))
    }
  },

  // Convenience methods using the generic updater
  updateTaskActualTime: async (id: string, actualMinutes: number) => {
    await get().updateTaskField(id, { actualMinutes }, 'Failed to update task time')
  },

  updateTaskDescription: async (id: string, description: string) => {
    await get().updateTaskField(id, { description }, 'Failed to update task description')
  },

  updateTaskEstimatedTime: async (id: string, estimatedMinutes: number) => {
    await get().updateTaskField(id, { estimatedMinutes }, 'Failed to update task estimated time')
  },

  saveCurrentEditingTask: async (description: string, estimatedMinutes: number) => {
    const { editingTaskId } = get()
    if (!editingTaskId) return
    await get().updateTaskField(editingTaskId, { description, estimatedMinutes }, 'Failed to save task changes')
  },

  // Sync methods for UI state (no database operations)
  startTask: (id: string) => {
    set((state) => ({
      tasks: state.tasks.map((task) => ({
        ...task,
        isActive: task.id === id,
      })),
      activeTaskId: id,
      isTrackingMode: true,
    }))
  },

  stopTask: () => {
    set((state) => ({
      tasks: state.tasks.map((task) => ({
        ...task,
        isActive: false,
      })),
      activeTaskId: null,
      isTrackingMode: false,
    }))
  },

  pauseTask: () => {
    set((state) => ({
      tasks: state.tasks.map((task) => ({
        ...task,
        isActive: false,
      })),
      isTrackingMode: false,
    }))
  },

  resumeTask: () => {
    set((state) => ({
      isTrackingMode: true,
    }))
  },

  setEditingTask: (id: string | null) => {
    set({ editingTaskId: id })
  },

  clearEditingTask: () => {
    set({ editingTaskId: null })
  },

  setShowCreateTask: (show: boolean) => {
    set({ showCreateTask: show })
  },

  toggleCreateTask: () => {
    set((state) => ({ showCreateTask: !state.showCreateTask }))
  },

  clearError: () => {
    set({ error: null })
  },

  getInspirationalQuote: () => {
    const state = get()
    return INSPIRATIONAL_QUOTES[state.quoteIndex]
  },

  cycleQuote: () => {
    set((state) => ({
      quoteIndex: (state.quoteIndex + 1) % INSPIRATIONAL_QUOTES.length
    }))
  },

  clearAllTasks: () => {
    set({
      tasks: [],
      activeTaskId: null,
      isTrackingMode: false,
      editingTaskId: null,
      showCreateTask: false,
      isLoading: false,
      error: null,
      userId: null,
      isInitialized: false
    })
  },

  // Group two tasks together (drag task onto another)
  groupTasks: async (taskId: string, targetTaskId: string) => {
    const state = get()
    const task = state.tasks.find(t => t.id === taskId)
    const targetTask = state.tasks.find(t => t.id === targetTaskId)

    if (!task || !targetTask) return

    // Generate new groupId or use target's existing groupId
    const groupId = targetTask.groupId || crypto.randomUUID()

    // Update both tasks optimistically
    set((state) => ({
      tasks: state.tasks.map(t => {
        if (t.id === taskId) return { ...t, groupId }
        if (t.id === targetTaskId) return { ...t, groupId }
        return t
      })
    }))

    try {
      set({ error: null })
      // Update both tasks in database
      await updateTodo(taskId, { groupId })
      if (!targetTask.groupId) {
        await updateTodo(targetTaskId, { groupId })
      }
    } catch (error) {
      console.error('Error grouping tasks:', error)
      // Revert on failure
      set({
        tasks: state.tasks,
        error: error instanceof Error ? error.message : 'Failed to group tasks'
      })
    }
  },

  // Remove task from its group
  ungroupTask: async (taskId: string) => {
    const state = get()
    const task = state.tasks.find(t => t.id === taskId)

    if (!task || !task.groupId) return

    // Update task optimistically
    set((state) => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, groupId: undefined } : t
      )
    }))

    try {
      set({ error: null })
      await updateTodo(taskId, { groupId: undefined })
    } catch (error) {
      console.error('Error ungrouping task:', error)
      // Revert on failure
      set({
        tasks: state.tasks,
        error: error instanceof Error ? error.message : 'Failed to ungroup task'
      })
    }
  },

  // Load checklist items for a task
  loadChecklistItems: async (taskId: string) => {
    try {
      set({ error: null })
      const checklistItems = await fetchChecklistItems(taskId)

      // Update the task with checklist items
      set((state) => ({
        tasks: state.tasks.map(task =>
          task.id === taskId ? { ...task, checklistItems } : task
        )
      }))
    } catch (error) {
      console.error('Error loading checklist items:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to load checklist items'
      })
    }
  },

  // Add a new checklist item
  addChecklistItem: async (taskId: string, description: string) => {
    const task = get().tasks.find(t => t.id === taskId)
    if (!task) return

    const existingItems = task.checklistItems || []
    const nextOrder = existingItems.length

    // Optimistic item
    const optimisticItem: ChecklistItem = {
      id: crypto.randomUUID(),
      taskId,
      description,
      isCompleted: false,
      order: nextOrder,
      createdAt: new Date()
    }

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map(t =>
        t.id === taskId
          ? { ...t, checklistItems: [...(t.checklistItems || []), optimisticItem] }
          : t
      )
    }))

    try {
      set({ error: null })
      const newItem = await createChecklistItem(taskId, description, nextOrder)

      // Replace optimistic item with real one
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                checklistItems: (t.checklistItems || []).map(item =>
                  item.id === optimisticItem.id ? newItem : item
                )
              }
            : t
        )
      }))
    } catch (error) {
      console.error('Error adding checklist item:', error)
      // Remove optimistic item on failure
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                checklistItems: (t.checklistItems || []).filter(
                  item => item.id !== optimisticItem.id
                )
              }
            : t
        ),
        error: error instanceof Error ? error.message : 'Failed to add checklist item'
      }))
    }
  },

  // Update a checklist item
  updateChecklistItemField: async (id: string, updates: Partial<ChecklistItem>) => {
    // Find which task contains this checklist item
    const task = get().tasks.find(t =>
      t.checklistItems?.some(item => item.id === id)
    )
    if (!task) return

    const originalItem = task.checklistItems?.find(item => item.id === id)
    if (!originalItem) return

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map(t =>
        t.id === task.id
          ? {
              ...t,
              checklistItems: (t.checklistItems || []).map(item =>
                item.id === id ? { ...item, ...updates } : item
              )
            }
          : t
      )
    }))

    try {
      set({ error: null })
      await updateChecklistItem(id, updates)
    } catch (error) {
      console.error('Error updating checklist item:', error)
      // Revert on failure
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === task.id
            ? {
                ...t,
                checklistItems: (t.checklistItems || []).map(item =>
                  item.id === id ? originalItem : item
                )
              }
            : t
        ),
        error: error instanceof Error ? error.message : 'Failed to update checklist item'
      }))
    }
  },

  // Delete a checklist item
  deleteChecklistItem: async (id: string) => {
    // Find which task contains this checklist item
    const task = get().tasks.find(t =>
      t.checklistItems?.some(item => item.id === id)
    )
    if (!task) return

    const itemToDelete = task.checklistItems?.find(item => item.id === id)
    if (!itemToDelete) return

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map(t =>
        t.id === task.id
          ? {
              ...t,
              checklistItems: (t.checklistItems || []).filter(item => item.id !== id)
            }
          : t
      )
    }))

    try {
      set({ error: null })
      await deleteChecklistItem(id)
    } catch (error) {
      console.error('Error deleting checklist item:', error)
      // Restore on failure
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === task.id
            ? {
                ...t,
                checklistItems: [...(t.checklistItems || []), itemToDelete].sort(
                  (a, b) => a.order - b.order
                )
              }
            : t
        ),
        error: error instanceof Error ? error.message : 'Failed to delete checklist item'
      }))
    }
  },

  // Toggle checklist item completion
  toggleChecklistItemCompletion: async (id: string) => {
    // Find which task contains this checklist item
    const task = get().tasks.find(t =>
      t.checklistItems?.some(item => item.id === id)
    )
    if (!task) return

    const item = task.checklistItems?.find(item => item.id === id)
    if (!item) return

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map(t =>
        t.id === task.id
          ? {
              ...t,
              checklistItems: (t.checklistItems || []).map(checklistItem =>
                checklistItem.id === id
                  ? { ...checklistItem, isCompleted: !checklistItem.isCompleted }
                  : checklistItem
              )
            }
          : t
      )
    }))

    try {
      set({ error: null })
      await toggleChecklistItemCompletion(id)
    } catch (error) {
      console.error('Error toggling checklist item:', error)
      // Revert on failure
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === task.id
            ? {
                ...t,
                checklistItems: (t.checklistItems || []).map(checklistItem =>
                  checklistItem.id === id ? item : checklistItem
                )
              }
            : t
        ),
        error:
          error instanceof Error ? error.message : 'Failed to toggle checklist item'
      }))
    }
  },

  // Update checklist item order
  updateChecklistItemOrder: async (taskId: string, items: ChecklistItem[]) => {
    const task = get().tasks.find(t => t.id === taskId)
    if (!task) return

    const originalItems = task.checklistItems

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, checklistItems: items } : t
      )
    }))

    try {
      set({ error: null })
      await updateChecklistItemOrder(items)
    } catch (error) {
      console.error('Error updating checklist item order:', error)
      // Revert on failure
      set((state) => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, checklistItems: originalItems } : t
        ),
        error:
          error instanceof Error ? error.message : 'Failed to update checklist item order'
      }))
    }
  },
}))

// For backward compatibility, export the old name as well
export const useTaskStore = useToDoStore
