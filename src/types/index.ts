export interface Task {
  id: string
  description: string
  estimatedMinutes: number
  actualMinutes?: number
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

export interface TaskHistoryEntry {
  id: string
  normalizedDescription: string
  originalDescription: string
  estimatedMinutes: number
  actualMinutes: number
  completedAt: Date
}

export interface SimilarTaskStats {
  count: number
  averageMinutes: number
  medianMinutes: number
  p90Minutes: number
  similarEntries: TaskHistoryEntry[]
}
