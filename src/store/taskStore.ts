import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Task, AppState } from '@/types'

interface TaskStore extends AppState {
  addTask: (description: string, estimatedMinutes: number) => void
  deleteTask: (id: string) => void
  toggleTaskCompletion: (id: string) => void
  startTask: (id: string) => void
  stopTask: () => void
  pauseTask: () => void
  resumeTask: () => void
  updateTaskOrder: (tasks: Task[]) => void
  updateTaskActualTime: (id: string, actualMinutes: number) => void
  setTaskElapsedTime: (id: string, elapsedSeconds: number) => void
  updateTaskDescription: (id: string, description: string) => void
  updateTaskEstimatedTime: (id: string, estimatedMinutes: number) => void
  setEditingTask: (id: string | null) => void
  clearEditingTask: () => void
  saveCurrentEditingTask: (description: string, estimatedMinutes: number) => void
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      activeTaskId: null,
      isTrackingMode: false,
      editingTaskId: null,

      addTask: (description: string, estimatedMinutes: number) => {
        const newTask: Task = {
          id: crypto.randomUUID(),
          description,
          estimatedMinutes,
          isCompleted: false,
          isActive: false,
          createdAt: new Date(),
          order: get().tasks.length,
        }
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }))
      },

      deleteTask: (id: string) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          activeTaskId: state.activeTaskId === id ? null : state.activeTaskId,
        }))
      },

      toggleTaskCompletion: (id: string) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  isCompleted: !task.isCompleted,
                  completedAt: !task.isCompleted ? new Date() : undefined,
                }
              : task
          ),
        }))
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
            isPaused: task.isActive ? true : task.isPaused,
          })),
        }))
      },

      resumeTask: () => {
        set((state) => ({
          tasks: state.tasks.map((task) => ({
            ...task,
            isPaused: task.isActive ? false : task.isPaused,
          })),
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

      setTaskElapsedTime: (id: string, elapsedSeconds: number) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, elapsedSeconds } : task
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
    }),
    {
      name: 'todoloo-storage',
    }
  )
)
