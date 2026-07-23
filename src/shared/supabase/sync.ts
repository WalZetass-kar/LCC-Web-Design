import { supabase } from './config.js'
import { v4 as uuidv4 } from 'uuid'
// Assuming there's a local database instance we can access or pass to the sync service
// For now, this is a skeleton showing offline-first architecture with Queue System.

export interface SyncTask {
  id: string
  table: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  payload: any
  status: 'PENDING' | 'SYNCED' | 'FAILED'
  retry_count: number
  created_at: string
}

let isSyncing = false

export const queueSyncTask = async (table: string, action: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => {
  // In a real implementation, you would save this task to a local SQLite 'sync_queue' table
  // Example pseudo-code:
  // db.insert(syncQueue).values({
  //   id: uuidv4(),
  //   table_name: table,
  //   action: action,
  //   data: JSON.stringify(payload),
  //   synced: false,
  //   created_at: new Date().toISOString()
  // }).run()
  
  // Then trigger background sync
  void runBackgroundSync()
}

export const runBackgroundSync = async () => {
  if (isSyncing) return
  isSyncing = true
  
  try {
    // 1. Fetch pending tasks from local SQLite 'sync_queue' table
    // const pendingTasks = db.select().from(syncQueue).where(eq(syncQueue.synced, false)).all()
    const pendingTasks: any[] = [] // Placeholder
    
    if (pendingTasks.length === 0) {
      isSyncing = false
      return
    }

    // 2. Iterate and push to Supabase
    for (const task of pendingTasks) {
      try {
        let error = null
        if (task.action === 'INSERT') {
          const insertData: any = JSON.parse(task.data)
          const { error: err } = await (supabase.from(task.table_name) as any).insert(insertData)
          error = err
        } else if (task.action === 'UPDATE') {
          const payload: any = JSON.parse(task.data)
          const { error: err } = await (supabase.from(task.table_name) as any).update(payload).eq('id', payload.id)
          error = err
        } else if (task.action === 'DELETE') {
          const payload: any = JSON.parse(task.data)
          const { error: err } = await (supabase.from(task.table_name) as any).delete().eq('id', payload.id)
          error = err
        }

        if (!error) {
          // Mark as synced locally
          // db.update(syncQueue).set({ synced: true }).where(eq(syncQueue.id, task.id)).run()
        } else {
          console.error(`Sync failed for task ${task.id}:`, error)
          // Implement Retry Otomatis / Conflict Resolution here
        }
      } catch (e) {
        console.error('Error processing sync task:', e)
      }
    }
  } finally {
    isSyncing = false
  }
}

// Set up periodic sync
setInterval(runBackgroundSync, 30000) // Every 30 seconds

// Set up Realtime listener to pull changes from Supabase to local SQLite
export const setupRealtimeSync = (tableName: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`public:${tableName}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
    .subscribe()
}
