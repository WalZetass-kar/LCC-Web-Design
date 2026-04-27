import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import { app } from 'electron'
import * as schema from './schema.js'

// Resolve DB path: use app resources in production, project root in dev
function getDbPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'sistem_pos.db')
  }
  return path.join(process.cwd(), 'sistem_pos.db')
}

const sqlite = new Database(getDbPath())
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
export type DB = typeof db
