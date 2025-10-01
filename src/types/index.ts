export interface Task {
  id: string
  description: string
  estimatedMinutes: number
  actualMinutes?: number
  elapsedSeconds?: number
  isCompleted: boolean
  isActive: boolean
  isPaused?: boolean
  createdAt: Date
  completedAt?: Date
  order: number
}

export interface AppState {
  tasks: Task[]
  activeTaskId: string | null
  isTrackingMode: boolean
  editingTaskId: string | null
}
