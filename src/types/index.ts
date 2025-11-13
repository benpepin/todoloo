export interface ChecklistItem {
  id: string
  taskId: string  // Parent task ID
  description: string
  isCompleted: boolean
  order: number
  createdAt: Date
}

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
  userId?: string // The owner of this task (for shared lists)
  listId?: string // The list this task belongs to
  groupId?: string // ID to group related tasks together
  createdByUserId?: string // The user who created this task
  createdByName?: string // Display name of the creator (enriched from DB)
  checklistItems?: ChecklistItem[]  // Optional array of checklist items
  musicEnabled?: boolean // Whether music generation is enabled for this task
  musicUrl?: string // URL to the generated music file
  musicGenerationStatus?: 'idle' | 'generating' | 'ready' | 'error' // Status of music generation
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

export interface ListShare {
  id: string
  createdAt: Date
  listOwnerId: string
  sharedWithUserId: string
  sharedWithEmail?: string
  permission: 'read' | 'write'
}

export interface SharedUser {
  userId: string
  email: string
  permission: 'read' | 'write'
  sharedAt: Date
}

export interface List {
  id: string
  userId: string
  name: string
  order: number
  createdAt: Date
  updatedAt: Date
}
