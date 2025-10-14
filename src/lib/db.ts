import { supabase } from './supabase-browser'
import { Task, TaskHistoryEntry, ListShare, SharedUser } from '@/types'

// Database types (snake_case for Supabase)
interface DbTask {
  id: string
  created_at: string
  updated_at: string
  title: string
  description?: string
  is_completed: boolean
  completed_at?: string
  estimated_duration: number
  actual_duration?: number
  started_at?: string
  order_index: number
  tags?: string[]
  group_id?: string
  created_by_user_id?: string
}

interface DbTaskCompletion {
  id: string
  todo_id: string
  completed_at: string
  duration: number
  task_title: string
  tags?: string[]
}

interface DbListShare {
  id: string
  created_at: string
  list_owner_id: string
  shared_with_user_id: string
  permission: 'read' | 'write'
}

// Convert between camelCase (app) and snake_case (database)
function dbTaskToTask(dbTask: DbTask & { user_id?: string }): Task {
  return {
    id: dbTask.id,
    description: dbTask.title, // Map title to description for consistency
    estimatedMinutes: dbTask.estimated_duration,
    actualMinutes: dbTask.actual_duration,
    isCompleted: dbTask.is_completed,
    isActive: false, // Will be set by the store
    createdAt: new Date(dbTask.created_at),
    completedAt: dbTask.completed_at ? new Date(dbTask.completed_at) : undefined,
    order: dbTask.order_index,
    userId: dbTask.user_id, // Include user_id for shared list detection
    groupId: dbTask.group_id,
    createdByUserId: dbTask.created_by_user_id
  }
}

function taskToDbTask(task: Task): Partial<DbTask> {
  return {
    id: task.id,
    title: task.description, // Map description to title
    description: task.description,
    is_completed: task.isCompleted,
    completed_at: task.completedAt?.toISOString(),
    estimated_duration: task.estimatedMinutes,
    actual_duration: task.actualMinutes,
    started_at: undefined, // Will be handled separately
    order_index: task.order,
    tags: [] // TODO: Add tags support later
  }
}

// Enrich tasks with creator display names
async function enrichTasksWithCreatorNames(tasks: Task[]): Promise<Task[]> {
  // Get unique creator IDs
  const creatorIds = [...new Set(tasks.map(t => t.createdByUserId).filter(Boolean))] as string[]

  if (creatorIds.length === 0) {
    return tasks
  }

  // Fetch all creator names in parallel
  const creatorNames = await Promise.all(
    creatorIds.map(async (userId) => {
      const { data, error } = await supabase.rpc('get_user_display_name', { user_id: userId })
      if (error) {
        console.error('Error fetching creator name for', userId, error)
        return { userId, name: 'Someone' }
      }
      return { userId, name: data || 'Someone' }
    })
  )

  // Create a map for quick lookup
  const creatorNameMap = new Map(creatorNames.map(c => [c.userId, c.name]))

  // Enrich tasks with creator names
  return tasks.map(task => ({
    ...task,
    createdByName: task.createdByUserId ? creatorNameMap.get(task.createdByUserId) : undefined
  }))
}

// Fetch all todos for a specific user with shared list permission checking
export async function fetchTodos(userId: string, checkPermissions: boolean = false): Promise<Task[]> {
  // Check permissions if requested (for shared lists)
  if (checkPermissions) {
    const { data: shares } = await supabase
      .from('list_shares')
      .select('list_owner_id')
      .eq('shared_with_user_id', (await supabase.auth.getUser()).data.user?.id)

    const sharedOwnerIds = shares?.map(s => s.list_owner_id) || []
    const currentUserId = (await supabase.auth.getUser()).data.user?.id

    if (userId !== currentUserId && !sharedOwnerIds.includes(userId)) {
      throw new Error('Access denied: No permission to view this user\'s todos')
    }
  }

  const { data, error } = await supabase
    .from('todos')
    .select('*, user_id, group_id, created_by_user_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch todos: ${error.message}`)
  }

  const mapped = data?.map(dbTaskToTask) || []
  return enrichTasksWithCreatorNames(mapped)
}

// Alias for backward compatibility
export const fetchTodosDirect = (userId: string) => fetchTodos(userId, true)

// Create todo
export async function createTodo(
  task: Omit<Task, 'id' | 'createdAt' | 'order'>,
  userId: string,
  createdByUserId?: string
): Promise<Task> {
  const currentUser = await supabase.auth.getUser()
  const actualCreatorId = createdByUserId || currentUser.data.user?.id || userId

  const dbTask = {
    title: task.description,
    description: task.description,
    is_completed: task.isCompleted,
    estimated_duration: task.estimatedMinutes,
    actual_duration: task.actualMinutes,
    completed_at: task.completedAt?.toISOString(),
    order_index: 0,
    tags: [], // TODO: Add tags support later
    user_id: userId,
    group_id: task.groupId,
    created_by_user_id: actualCreatorId
  }

  const { data, error } = await supabase
    .from('todos')
    .insert([dbTask])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create todo: ${error.message}`)
  }

  const mappedTask = dbTaskToTask(data)
  const enrichedTasks = await enrichTasksWithCreatorNames([mappedTask])
  return enrichedTasks[0]
}

// Update todo
export async function updateTodo(id: string, updates: Partial<Task>): Promise<Task> {
  const dbUpdates: Partial<DbTask> = {}
  
  if (updates.description !== undefined) {
    dbUpdates.title = updates.description
    dbUpdates.description = updates.description
  }
  if (updates.isCompleted !== undefined) {
    dbUpdates.is_completed = updates.isCompleted
  }
  if (updates.completedAt !== undefined) {
    dbUpdates.completed_at = updates.completedAt?.toISOString()
  }
  if (updates.estimatedMinutes !== undefined) {
    dbUpdates.estimated_duration = updates.estimatedMinutes
  }
  if (updates.actualMinutes !== undefined) {
    dbUpdates.actual_duration = updates.actualMinutes
  }
  if (updates.order !== undefined) {
    dbUpdates.order_index = updates.order
  }
  if (updates.groupId !== undefined) {
    dbUpdates.group_id = updates.groupId
  }
  
  dbUpdates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('todos')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating todo:', error)
    throw new Error(`Failed to update todo: ${error.message}`)
  }
  
  return dbTaskToTask(data)
}

// Delete todo
export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting todo:', error)
    throw new Error(`Failed to delete todo: ${error.message}`)
  }
}

// Complete todo and record duration for time estimation
export async function completeTodo(id: string, duration: number, task: Task, userId: string): Promise<void> {
  // Update todo
  const { error: todoError } = await supabase
    .from('todos')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
      actual_duration: duration,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    // Removed user_id filter to allow shared list collaborators to complete tasks
  
  if (todoError) {
    console.error('Error completing todo:', todoError)
    throw new Error(`Failed to complete todo: ${todoError.message}`)
  }
  
  // Record completion for time estimation
  const { error: completionError } = await supabase
    .from('task_completions')
    .insert([{
      todo_id: id,
      duration: duration,
      task_title: task.description,
      tags: [], // TODO: Add tags support later
      user_id: userId
    }])
  
  if (completionError) {
    console.error('Error recording completion:', completionError)
    // Don't throw here - the todo was completed successfully
    console.warn('Failed to record completion for time estimation')
  }
}

// Get average duration for similar tasks (for estimation)
export async function getAverageDuration(userId: string, tags?: string[]): Promise<number | null> {
  let query = supabase
    .from('task_completions')
    .select('duration')
    .eq('user_id', userId)
  
  if (tags && tags.length > 0) {
    query = query.overlaps('tags', tags)
  }
  
  const { data, error } = await query
    .limit(10)
    .order('completed_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching completion history:', error)
    return null
  }
  
  if (!data || data.length === 0) return null
  
  const avgDuration = data.reduce((sum, item) => sum + item.duration, 0) / data.length
  return Math.round(avgDuration)
}

// Fetch task completion history for time estimation
export async function fetchTaskCompletions(userId: string): Promise<TaskHistoryEntry[]> {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(100) // Limit to recent completions
  
  if (error) {
    console.error('Error fetching task completions:', error)
    throw new Error(`Failed to fetch task completions: ${error.message}`)
  }
  
  return data?.map(completion => ({
    id: completion.id,
    normalizedDescription: completion.task_title.toLowerCase().trim(),
    originalDescription: completion.task_title,
    estimatedMinutes: 0, // Not stored in completions table
    actualMinutes: completion.duration,
    completedAt: new Date(completion.completed_at)
  })) || []
}

// Update task order (bulk update)
export async function updateTaskOrder(tasks: Task[]): Promise<void> {
  // Only update incomplete tasks - completed tasks should keep their original order
  const incompleteTasks = tasks.filter(task => !task.isCompleted)
  
  const updates = incompleteTasks.map(task => ({
    id: task.id,
    order_index: task.order
  }))
  
  if (updates.length === 0) {
    return
  }
  
  // Use a transaction-like approach with Promise.all
  const updatePromises = updates.map(update => 
    supabase
      .from('todos')
      .update({ order_index: update.order_index, updated_at: new Date().toISOString() })
      .eq('id', update.id)
  )
  
  const results = await Promise.all(updatePromises)
  
  // Check for any errors
  const errors = results.filter(result => result.error)
  if (errors.length > 0) {
    console.error('Error updating task order:', errors)
    throw new Error(`Failed to update task order: ${errors[0].error?.message}`)
  }
}

// Backfill existing data to current user
export async function backfillUserData(userId: string): Promise<void> {
  const { error } = await supabase.rpc('backfill_owner', { owner_id: userId })

  if (error) {
    // If the RPC is missing (e.g. PGRST202) or not exposed yet, don't block app usage
    const errorCode = (error as { code?: string }).code
    if (errorCode === 'PGRST202') {
      console.warn('Optional RPC backfill_owner not found; skipping backfill.')
      return
    }

    console.error('Error backfilling user data:', error)
    // Degrade gracefully so users can proceed even if backfill is unavailable
    return
  }
}

// ============================================================================
// List Sharing Functions
// ============================================================================

// Share list with another user by email
export async function shareListWithUser(
  ownerUserId: string,
  shareWithEmail: string,
  permission: 'read' | 'write' = 'write'
): Promise<ListShare> {
  // First, find the user by email
  const { data: targetUserId, error: findError } = await supabase
    .rpc('find_user_by_email', { user_email: shareWithEmail })

  if (findError || !targetUserId) {
    throw new Error(`User with email ${shareWithEmail} not found`)
  }

  // Don't allow sharing with yourself
  if (targetUserId === ownerUserId) {
    throw new Error('You cannot share your list with yourself')
  }

  // Create the share
  const { data, error } = await supabase
    .from('list_shares')
    .insert([{
      list_owner_id: ownerUserId,
      shared_with_user_id: targetUserId,
      permission
    }])
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('List is already shared with this user')
    }
    console.error('Error sharing list:', error)
    throw new Error(`Failed to share list: ${error.message}`)
  }

  return {
    id: data.id,
    createdAt: new Date(data.created_at),
    listOwnerId: data.list_owner_id,
    sharedWithUserId: data.shared_with_user_id,
    sharedWithEmail: shareWithEmail,
    permission: data.permission
  }
}

// Get all users who have access to your list
export async function getSharedUsers(ownerUserId: string): Promise<SharedUser[]> {
  const { data, error } = await supabase
    .from('list_shares')
    .select('*')
    .eq('list_owner_id', ownerUserId)

  if (error) {
    console.error('Error fetching shared users:', error)
    throw new Error(`Failed to fetch shared users: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Get emails for each shared user
  const sharedUsers = await Promise.all(
    data.map(async (share) => {
      const { data: email } = await supabase.rpc('get_user_email', {
        user_id: share.shared_with_user_id
      })

      return {
        userId: share.shared_with_user_id,
        email: email || 'Unknown',
        permission: share.permission as 'read' | 'write',
        sharedAt: new Date(share.created_at)
      }
    })
  )

  return sharedUsers
}

// Get lists that have been shared with you
export async function getSharedLists(userId: string): Promise<Array<{ ownerId: string, ownerEmail: string, permission: 'read' | 'write' }>> {
  const { data, error } = await supabase
    .from('list_shares')
    .select('*')
    .eq('shared_with_user_id', userId)

  if (error) {
    console.error('Error fetching shared lists:', error)
    throw new Error(`Failed to fetch shared lists: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Get owner emails
  const sharedLists = await Promise.all(
    data.map(async (share) => {
      const { data: email } = await supabase.rpc('get_user_email', {
        user_id: share.list_owner_id
      })

      return {
        ownerId: share.list_owner_id,
        ownerEmail: email || 'Unknown',
        permission: share.permission as 'read' | 'write'
      }
    })
  )

  return sharedLists
}

// Remove share access
export async function removeShare(ownerUserId: string, sharedWithUserId: string): Promise<void> {
  const { error } = await supabase
    .from('list_shares')
    .delete()
    .eq('list_owner_id', ownerUserId)
    .eq('shared_with_user_id', sharedWithUserId)

  if (error) {
    console.error('Error removing share:', error)
    throw new Error(`Failed to remove share: ${error.message}`)
  }
}


// Update share permission
export async function updateSharePermission(
  ownerUserId: string,
  sharedWithUserId: string,
  permission: 'read' | 'write'
): Promise<void> {
  const { error } = await supabase
    .from('list_shares')
    .update({ permission })
    .eq('list_owner_id', ownerUserId)
    .eq('shared_with_user_id', sharedWithUserId)

  if (error) {
    console.error('Error updating share permission:', error)
    throw new Error(`Failed to update permission: ${error.message}`)
  }
}
