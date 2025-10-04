import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Task, AppState } from '@/types'
import { useHistoryStore } from './historyStore'
import { indexedDbStorage } from '@/storage/indexedDbStorage'

interface ToDoStore extends AppState {
  addTask: (description: string, estimatedMinutes: number) => void
  deleteTask: (id: string) => void
  toggleTaskCompletion: (id: string) => void
  startTask: (id: string) => void
  stopTask: () => void
  pauseTask: () => void
  resumeTask: () => void
  updateTaskOrder: (tasks: Task[]) => void
  updateTaskActualTime: (id: string, actualMinutes: number) => void
  updateTaskDescription: (id: string, description: string) => void
  updateTaskEstimatedTime: (id: string, estimatedMinutes: number) => void
  setEditingTask: (id: string | null) => void
  clearEditingTask: () => void
  saveCurrentEditingTask: (description: string, estimatedMinutes: number) => void
  showCreateTask: boolean
  setShowCreateTask: (show: boolean) => void
  toggleCreateTask: () => void
}

export const useToDoStore = create<ToDoStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      activeTaskId: null,
      isTrackingMode: false,
      editingTaskId: null,
      showCreateTask: false,

      addTask: (description: string, estimatedMinutes: number) => {
        const newTask: Task = {
          id: crypto.randomUUID(),
          description,
          estimatedMinutes,
          actualMinutes: 0,
          isCompleted: false,
          isActive: false,
          createdAt: new Date(),
          order: get().tasks.length
        }

        set((state) => ({
          tasks: [newTask, ...state.tasks.map(task => ({
            ...task,
            order: task.order + 1
          }))]
        }))
      },

      deleteTask: (id: string) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
        }))
      },

      toggleTaskCompletion: (id: string) => {
        set((state) => {
          const task = state.tasks.find(t => t.id === id)
          if (!task) return state
          
          const isCompleting = !task.isCompleted
          
          const updatedTasks = state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  isCompleted: !task.isCompleted,
                  completedAt: !task.isCompleted ? new Date() : undefined,
                }
              : task
          )
          
          // If to do is being completed, add to history
          if (isCompleting && task) {
            const { addEntry } = useHistoryStore.getState()
            addEntry({
              normalizedDescription: task.description.toLowerCase().trim(),
              originalDescription: task.description,
              estimatedMinutes: task.estimatedMinutes,
              actualMinutes: task.actualMinutes || task.estimatedMinutes,
              completedAt: new Date()
            })
          }
          
          return { tasks: updatedTasks }
        })
      },

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

      updateTaskOrder: (tasks: Task[]) => {
        set({ tasks })
      },

      updateTaskActualTime: (id: string, actualMinutes: number) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, actualMinutes } : task
          ),
        }))
      },

      updateTaskDescription: (id: string, description: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, description } : task
          ),
        }))
      },

      updateTaskEstimatedTime: (id: string, estimatedMinutes: number) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, estimatedMinutes } : task
          ),
        }))
      },

      setEditingTask: (id: string | null) => {
        set({ editingTaskId: id })
      },

      clearEditingTask: () => {
        set({ editingTaskId: null })
      },

      saveCurrentEditingTask: (description: string, estimatedMinutes: number) => {
        const { editingTaskId } = get()
        if (editingTaskId) {
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === editingTaskId 
                ? { ...task, description, estimatedMinutes }
                : task
            ),
          }))
        }
      },

      setShowCreateTask: (show: boolean) => {
        set({ showCreateTask: show })
      },

      toggleCreateTask: () => {
        set((state) => ({ showCreateTask: !state.showCreateTask }))
      },
    }),
    {
      name: 'todo-store',
      storage: indexedDbStorage,
      partialize: (state) => ({
        tasks: state.tasks,
        activeTaskId: state.activeTaskId,
        isTrackingMode: state.isTrackingMode,
        editingTaskId: state.editingTaskId,
        showCreateTask: state.showCreateTask,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('To do store rehydrated successfully')
        }
      },
    }
  )
)

// For backward compatibility, export the old name as well
export const useTaskStore = useToDoStore
