import { create } from 'zustand'
import { Task, AppState } from '@/types'
import { useHistoryStore } from './historyStore'
import { 
  fetchTodos, 
  createTodo, 
  updateTodo, 
  deleteTodo, 
  completeTodo, 
  updateTaskOrder as updateTaskOrderDb,
  backfillUserData
} from '@/lib/db'

interface ToDoStore extends AppState {
  isLoading: boolean
  error: string | null
  userId: string | null
  isInitialized: boolean
  currentListOwnerId: string | null // Track which list we're viewing (for shared lists)

  // Async methods for Supabase operations
  initializeUser: (userId: string) => Promise<void>
  loadTasks: () => Promise<void>
  switchToList: (listOwnerId: string) => Promise<void>
  addTask: (description: string, estimatedMinutes: number, groupId?: string) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTaskCompletion: (id: string) => Promise<void>
  updateTaskOrder: (tasks: Task[]) => Promise<void>
  updateTaskActualTime: (id: string, actualMinutes: number) => Promise<void>
  updateTaskDescription: (id: string, description: string) => Promise<void>
  updateTaskEstimatedTime: (id: string, estimatedMinutes: number) => Promise<void>
  saveCurrentEditingTask: (description: string, estimatedMinutes: number) => Promise<void>
  
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

  // Initialize user and backfill data
  initializeUser: async (userId: string) => {
    try {
      set({ isLoading: true, error: null, userId })
      
      // Backfill existing data to this user
      await backfillUserData(userId)
      
      // Load tasks for this user
      const tasks = await fetchTodos(userId)
      
      set({ 
        tasks, 
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
    const { userId } = get()
    if (!userId) {
      set({ error: 'User not authenticated' })
      return
    }

    try {
      set({ isLoading: true, error: null })
      const tasks = await fetchTodos(userId)

      // Determine if we're viewing a shared list
      // If we have tasks and they all belong to someone else, we're viewing their shared list
      let currentListOwnerId = userId
      if (tasks.length > 0 && tasks[0].userId && tasks[0].userId !== userId) {
        // We're viewing someone else's shared list
        currentListOwnerId = tasks[0].userId
      }

      set({ tasks, isLoading: false, currentListOwnerId })
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
      const tasks = await fetchTodos(listOwnerId)
      set({ tasks, isLoading: false })
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
      return
    }

    // Use currentListOwnerId to create task in the right list
    // If viewing a shared list, create task for that list owner
    const targetUserId = currentListOwnerId || userId

    const optimisticTask: Task = {
      id: crypto.randomUUID(),
      description,
      estimatedMinutes,
      actualMinutes: 0,
      isCompleted: false,
      isActive: false,
      createdAt: new Date(),
      order: get().tasks.length,
      userId: targetUserId,
      groupId
    }

    // Optimistic update
    set((state) => ({
      tasks: [optimisticTask, ...state.tasks.map(task => ({
        ...task,
        order: task.order + 1
      }))]
    }))

    try {
      set({ error: null })
      console.log('[STORE] addTask calling createTodo with groupId:', groupId)
      const newTask = await createTodo({
        description,
        estimatedMinutes,
        actualMinutes: 0,
        isCompleted: false,
        isActive: false,
        groupId
      }, targetUserId)
      console.log('[STORE] createTodo returned task with groupId:', newTask.groupId)

      // Replace optimistic task with real one
      set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === optimisticTask.id ? { ...newTask, order: optimisticTask.order } : task
        )
      }))
    } catch (error) {
      console.error('Error creating task:', error)
      // Remove optimistic task on failure
      set((state) => ({
        tasks: state.tasks.filter(task => task.id !== optimisticTask.id),
        error: error instanceof Error ? error.message : 'Failed to create task'
      }))
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

  // Update task actual time
  updateTaskActualTime: async (id: string, actualMinutes: number) => {
    const originalTask = get().tasks.find(task => task.id === id)
    if (!originalTask) return

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, actualMinutes } : task
      ),
    }))

    try {
      set({ error: null })
      await updateTodo(id, { actualMinutes })
    } catch (error) {
      console.error('Error updating task actual time:', error)
      // Revert optimistic update
      set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === id ? originalTask : task
        ),
        error: error instanceof Error ? error.message : 'Failed to update task time'
      }))
    }
  },

  // Update task description
  updateTaskDescription: async (id: string, description: string) => {
    const originalTask = get().tasks.find(task => task.id === id)
    if (!originalTask) return

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, description } : task
      ),
    }))

    try {
      set({ error: null })
      await updateTodo(id, { description })
    } catch (error) {
      console.error('Error updating task description:', error)
      // Revert optimistic update
      set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === id ? originalTask : task
        ),
        error: error instanceof Error ? error.message : 'Failed to update task description'
      }))
    }
  },

  // Update task estimated time
  updateTaskEstimatedTime: async (id: string, estimatedMinutes: number) => {
    const originalTask = get().tasks.find(task => task.id === id)
    if (!originalTask) return

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, estimatedMinutes } : task
      ),
    }))

    try {
      set({ error: null })
      await updateTodo(id, { estimatedMinutes })
    } catch (error) {
      console.error('Error updating task estimated time:', error)
      // Revert optimistic update
      set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === id ? originalTask : task
        ),
        error: error instanceof Error ? error.message : 'Failed to update task estimated time'
      }))
    }
  },

  // Save current editing task
  saveCurrentEditingTask: async (description: string, estimatedMinutes: number) => {
    const { editingTaskId } = get()
    if (!editingTaskId) return

    const originalTask = get().tasks.find(task => task.id === editingTaskId)
    if (!originalTask) return

    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === editingTaskId 
          ? { ...task, description, estimatedMinutes }
          : task
      ),
    }))

    try {
      set({ error: null })
      await updateTodo(editingTaskId, { description, estimatedMinutes })
    } catch (error) {
      console.error('Error saving editing task:', error)
      // Revert optimistic update
      set((state) => ({
        tasks: state.tasks.map(task => 
          task.id === editingTaskId ? originalTask : task
        ),
        error: error instanceof Error ? error.message : 'Failed to save task changes'
      }))
    }
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
}))

// For backward compatibility, export the old name as well
export const useTaskStore = useToDoStore
