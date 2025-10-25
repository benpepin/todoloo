import { supabase } from './supabase-browser'
import { ChecklistItem } from '@/types'

// Database types (snake_case for Supabase)
interface DbChecklistItem {
  id: string
  task_id: string
  description: string
  is_completed: boolean
  order_index: number
  created_at: string
}

// Convert between camelCase (app) and snake_case (database)
function dbChecklistItemToChecklistItem(dbItem: DbChecklistItem): ChecklistItem {
  return {
    id: dbItem.id,
    taskId: dbItem.task_id,
    description: dbItem.description,
    isCompleted: dbItem.is_completed,
    order: dbItem.order_index,
    createdAt: new Date(dbItem.created_at)
  }
}

function checklistItemToDbChecklistItem(item: ChecklistItem): Partial<DbChecklistItem> {
  return {
    id: item.id,
    task_id: item.taskId,
    description: item.description,
    is_completed: item.isCompleted,
    order_index: item.order,
  }
}

/**
 * Fetch all checklist items for a given task
 */
export async function fetchChecklistItems(taskId: string): Promise<ChecklistItem[]> {
  try {
    const { data, error } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('task_id', taskId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching checklist items:', error)
      throw new Error(error.message)
    }

    if (!data) return []

    return data.map(dbChecklistItemToChecklistItem)
  } catch (error) {
    console.error('Failed to fetch checklist items:', error)
    // Fallback to IndexedDB if Supabase fails
    return fetchChecklistItemsFromIndexedDB(taskId)
  }
}

/**
 * Create a new checklist item
 */
export async function createChecklistItem(
  taskId: string,
  description: string,
  order: number = 0
): Promise<ChecklistItem> {
  const newItem: ChecklistItem = {
    id: crypto.randomUUID(),
    taskId,
    description,
    isCompleted: false,
    order,
    createdAt: new Date()
  }

  try {
    const dbItem = checklistItemToDbChecklistItem(newItem)
    const { data, error } = await supabase
      .from('checklist_items')
      .insert([{
        ...dbItem,
        created_at: newItem.createdAt.toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating checklist item:', error)
      throw new Error(error.message)
    }

    // Also save to IndexedDB as backup
    await saveChecklistItemToIndexedDB(newItem)

    return data ? dbChecklistItemToChecklistItem(data) : newItem
  } catch (error) {
    console.error('Failed to create checklist item:', error)
    // Fallback to IndexedDB if Supabase fails
    await saveChecklistItemToIndexedDB(newItem)
    return newItem
  }
}

/**
 * Update a checklist item
 */
export async function updateChecklistItem(
  id: string,
  updates: Partial<ChecklistItem>
): Promise<void> {
  try {
    const dbUpdates: Partial<DbChecklistItem> = {}

    if (updates.description !== undefined) {
      dbUpdates.description = updates.description
    }
    if (updates.isCompleted !== undefined) {
      dbUpdates.is_completed = updates.isCompleted
    }
    if (updates.order !== undefined) {
      dbUpdates.order_index = updates.order
    }

    const { error } = await supabase
      .from('checklist_items')
      .update(dbUpdates)
      .eq('id', id)

    if (error) {
      console.error('Error updating checklist item:', error)
      throw new Error(error.message)
    }

    // Also update in IndexedDB
    await updateChecklistItemInIndexedDB(id, updates)
  } catch (error) {
    console.error('Failed to update checklist item:', error)
    // Fallback to IndexedDB if Supabase fails
    await updateChecklistItemInIndexedDB(id, updates)
  }
}

/**
 * Toggle checklist item completion status
 */
export async function toggleChecklistItemCompletion(id: string): Promise<void> {
  try {
    // First fetch current state
    const { data, error: fetchError } = await supabase
      .from('checklist_items')
      .select('is_completed')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching checklist item:', fetchError)
      throw new Error(fetchError.message)
    }

    const newCompletionState = !data.is_completed

    const { error } = await supabase
      .from('checklist_items')
      .update({ is_completed: newCompletionState })
      .eq('id', id)

    if (error) {
      console.error('Error toggling checklist item:', error)
      throw new Error(error.message)
    }

    // Also update in IndexedDB
    await updateChecklistItemInIndexedDB(id, { isCompleted: newCompletionState })
  } catch (error) {
    console.error('Failed to toggle checklist item:', error)
    throw error
  }
}

/**
 * Delete a checklist item
 */
export async function deleteChecklistItem(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting checklist item:', error)
      throw new Error(error.message)
    }

    // Also delete from IndexedDB
    await deleteChecklistItemFromIndexedDB(id)
  } catch (error) {
    console.error('Failed to delete checklist item:', error)
    // Fallback to IndexedDB if Supabase fails
    await deleteChecklistItemFromIndexedDB(id)
  }
}

/**
 * Update the order of multiple checklist items
 */
export async function updateChecklistItemOrder(items: ChecklistItem[]): Promise<void> {
  try {
    // Update each item individually instead of using upsert
    // This avoids RLS issues with bulk operations
    await Promise.all(
      items.map((item, index) =>
        supabase
          .from('checklist_items')
          .update({ order_index: index })
          .eq('id', item.id)
      )
    )

    // Also update in IndexedDB
    await Promise.all(items.map((item, index) =>
      updateChecklistItemInIndexedDB(item.id, { order: index })
    ))
  } catch (error) {
    console.error('Failed to update checklist item order:', error)
    throw error
  }
}

// IndexedDB fallback functions
const DB_NAME = 'TodoloosChecklistDB'
const STORE_NAME = 'checklistItems'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        objectStore.createIndex('taskId', 'taskId', { unique: false })
        objectStore.createIndex('order', 'order', { unique: false })
      }
    }
  })
}

async function fetchChecklistItemsFromIndexedDB(taskId: string): Promise<ChecklistItem[]> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const index = objectStore.index('taskId')
    const request = index.getAll(taskId)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const items = request.result || []
        resolve(items.sort((a, b) => a.order - b.order))
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error fetching from IndexedDB:', error)
    return []
  }
}

async function saveChecklistItemToIndexedDB(item: ChecklistItem): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    objectStore.put(item)

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error('Error saving to IndexedDB:', error)
  }
}

async function updateChecklistItemInIndexedDB(
  id: string,
  updates: Partial<ChecklistItem>
): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const getRequest = objectStore.get(id)

    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const item = getRequest.result
        if (item) {
          const updatedItem = { ...item, ...updates }
          objectStore.put(updatedItem)
        }
        resolve()
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  } catch (error) {
    console.error('Error updating in IndexedDB:', error)
  }
}

async function deleteChecklistItemFromIndexedDB(id: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    objectStore.delete(id)

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error('Error deleting from IndexedDB:', error)
  }
}
