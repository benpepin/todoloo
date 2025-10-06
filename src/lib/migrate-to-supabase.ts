import { supabase } from './supabase'
import { Task } from '@/types'

interface MigrationResult {
  success: boolean
  message: string
  migratedCount?: number
}

// Check if migration already happened
const MIGRATION_KEY = 'todos_migrated_to_supabase'

export async function migrateLocalStorageToSupabase(): Promise<MigrationResult> {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return { success: true, message: 'Server-side: skipping migration' }
  }

  // Check if migration already happened
  if (localStorage.getItem(MIGRATION_KEY)) {
    return { success: true, message: 'Already migrated' }
  }
  
  try {
    // Get data from IndexedDB/localStorage
    const todoStoreData = localStorage.getItem('todo-store')
    const historyStoreData = localStorage.getItem('todoloo-history-storage')
    
    let todosToMigrate: Task[] = []
    let historyToMigrate: Array<{
      id: string
      normalizedDescription: string
      originalDescription: string
      estimatedMinutes: number
      actualMinutes: number
      completedAt: string
    }> = []
    
    // Parse todo store data
    if (todoStoreData) {
      try {
        const parsedData = JSON.parse(todoStoreData)
        todosToMigrate = parsedData.state?.tasks || []
      } catch (error) {
        console.warn('Failed to parse todo store data:', error)
      }
    }
    
    // Parse history store data
    if (historyStoreData) {
      try {
        const parsedData = JSON.parse(historyStoreData)
        historyToMigrate = parsedData.state?.entries || []
      } catch (error) {
        console.warn('Failed to parse history store data:', error)
      }
    }
    
    if (todosToMigrate.length === 0 && historyToMigrate.length === 0) {
      localStorage.setItem(MIGRATION_KEY, 'true')
      return { success: true, message: 'No data to migrate' }
    }
    
    let migratedTodos = 0
    let migratedHistory = 0
    
    // Migrate todos
    if (todosToMigrate.length > 0) {
      const dbTodos = todosToMigrate.map(task => ({
        id: task.id,
        title: task.description,
        description: task.description,
        is_completed: task.isCompleted,
        completed_at: task.completedAt?.toISOString(),
        estimated_duration: task.estimatedMinutes,
        actual_duration: task.actualMinutes,
        started_at: undefined, // Not stored in current format
        created_at: task.createdAt.toISOString(),
        updated_at: new Date().toISOString(),
        order_index: task.order || 0,
        tags: []
      }))
      
      const { error: todosError } = await supabase
        .from('todos')
        .insert(dbTodos)
      
      if (todosError) {
        console.error('Error migrating todos:', todosError)
        throw new Error(`Failed to migrate todos: ${todosError.message}`)
      }
      
      migratedTodos = todosToMigrate.length
    }
    
    // Migrate history (task completions)
    if (historyToMigrate.length > 0) {
      const dbCompletions = historyToMigrate.map(entry => ({
        todo_id: entry.id, // Use the history entry ID as a reference
        duration: entry.actualMinutes,
        task_title: entry.originalDescription,
        completed_at: new Date(entry.completedAt).toISOString(),
        tags: []
      }))
      
      const { error: historyError } = await supabase
        .from('task_completions')
        .insert(dbCompletions)
      
      if (historyError) {
        console.error('Error migrating history:', historyError)
        // Don't throw here - todos were migrated successfully
        console.warn('Failed to migrate history, but todos were migrated')
      } else {
        migratedHistory = historyToMigrate.length
      }
    }
    
    // Mark migration as complete
    localStorage.setItem(MIGRATION_KEY, 'true')
    
    const message = `Successfully migrated ${migratedTodos} todos${migratedHistory > 0 ? ` and ${migratedHistory} history entries` : ''}`
    return { 
      success: true, 
      message,
      migratedCount: migratedTodos + migratedHistory
    }
  } catch (error) {
    console.error('Migration error:', error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown migration error'
    }
  }
}

// Function to check if migration is needed
export function isMigrationNeeded(): boolean {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem(MIGRATION_KEY)
}

// Function to reset migration flag (for testing)
export function resetMigrationFlag(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MIGRATION_KEY)
}
