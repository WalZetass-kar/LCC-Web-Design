import { sqlite } from '../../database/connection.js'

export class ErrorLogService {
  static log(errorType: string, errorMessage: string, stackTrace?: string, userId?: string, context?: string) {
    try {
      sqlite.prepare('INSERT INTO mediasoft_error_logs (error_type, error_message, stack_trace, user_id, context) VALUES (?, ?, ?, ?, ?)').run(errorType, errorMessage, stackTrace, userId, context)
    } catch (err) {
      console.error('Failed to log error:', err)
    }
  }

  static getAll(limit: number = 100) {
    return sqlite.prepare('SELECT * FROM mediasoft_error_logs ORDER BY created_at DESC LIMIT ?').all(limit)
  }

  static deleteOld(days: number = 30) {
    const result = sqlite.prepare('DELETE FROM mediasoft_error_logs WHERE created_at < datetime("now", ?)').run(`-${days} days`)
    return { deleted: result.changes }
  }

  static clear() {
    const result = sqlite.prepare('DELETE FROM mediasoft_error_logs').run()
    return { deleted: result.changes }
  }
}
