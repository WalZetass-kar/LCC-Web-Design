import { db, sqlite } from '../../database/connection.js'
import { subscriptionPlans } from '../../database/schema.js'
import { eq } from 'drizzle-orm'

export interface PlanRow {
  id: number
  code?: string | null
  name: string
  price: number
  currency?: string | null
  duration_days: number
  description?: string | null
  features: string // JSON string
  is_active: number
  is_recommended: number
  created_at: string
  updated_at: string | null
  max_devices: number | null
  max_transactions_per_day: number | null
  max_products: number | null
  max_users: number | null
  feature_flags: string | null
  sort_order?: number | null
}

export interface PlanInput {
  code?: string
  name: string
  price: number
  currency?: string
  duration_days: number
  description?: string
  features: string[]
  is_active?: boolean
  is_recommended?: boolean
  max_devices?: number
  max_transactions_per_day?: number
  max_products?: number
  max_users?: number
  feature_flags?: Record<string, boolean>
  sort_order?: number
}

export class PlanModel {
  /** Get all plans (including inactive — for admin view) */
  static getAll(): PlanRow[] {
    try {
      return sqlite.prepare('SELECT * FROM mediasoft_subscription_plans ORDER BY COALESCE(sort_order, 0), id').all() as PlanRow[]
    } catch {
      return db.select().from(subscriptionPlans).all() as PlanRow[]
    }
  }

  /** Get only active plans (for pricing popup) */
  static getActive(): PlanRow[] {
    try {
      return sqlite.prepare('SELECT * FROM mediasoft_subscription_plans WHERE is_active = 1 ORDER BY COALESCE(sort_order, 0), id').all() as PlanRow[]
    } catch {
      return db.select().from(subscriptionPlans)
        .where(eq(subscriptionPlans.is_active, 1))
        .all() as PlanRow[]
    }
  }

  /** Get a single plan by ID */
  static getById(id: number): PlanRow | undefined {
    try {
      return sqlite.prepare('SELECT * FROM mediasoft_subscription_plans WHERE id = ? LIMIT 1').get(id) as PlanRow | undefined
    } catch {
      return db.select().from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id))
        .get() as PlanRow | undefined
    }
  }

  /** Create a new plan */
  static create(data: PlanInput) {
    const now = new Date().toISOString()

    // If this plan is recommended, un-recommend all others
    if (data.is_recommended) {
      try {
        sqlite.prepare('UPDATE mediasoft_subscription_plans SET is_recommended = 0, updated_at = ?').run(now)
      } catch {}
    }

    try {
      sqlite.prepare(`
        INSERT INTO mediasoft_subscription_plans (
          code, name, price, currency, duration_days, description, features, is_active, is_recommended,
          created_at, max_devices, max_transactions_per_day, max_products, max_users, feature_flags, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.code ?? null,
        data.name,
        data.price,
        data.currency ?? 'IDR',
        data.duration_days,
        data.description ?? null,
        JSON.stringify(data.features ?? []),
        data.is_active !== false ? 1 : 0,
        data.is_recommended ? 1 : 0,
        now,
        data.max_devices ?? 1,
        data.max_transactions_per_day ?? -1,
        data.max_products ?? -1,
        data.max_users ?? 1,
        JSON.stringify(data.feature_flags ?? {}),
        data.sort_order ?? 0
      )
    } catch {
      db.insert(subscriptionPlans).values({
        name: data.name,
        price: data.price,
        duration_days: data.duration_days,
        features: JSON.stringify(data.features ?? []),
        is_active: data.is_active !== false ? 1 : 0,
        is_recommended: data.is_recommended ? 1 : 0,
        created_at: now,
        max_devices: data.max_devices ?? 1,
        max_transactions_per_day: data.max_transactions_per_day ?? -1,
        max_products: data.max_products ?? -1,
        max_users: data.max_users ?? 1,
        feature_flags: JSON.stringify(data.feature_flags ?? {}),
      }).run()
    }
  }

  /** Update an existing plan */
  static update(id: number, data: Partial<PlanInput>) {
    const now = new Date().toISOString()

    if (data.is_recommended) {
      try {
        sqlite.prepare('UPDATE mediasoft_subscription_plans SET is_recommended = 0, updated_at = ?').run(now)
      } catch {}
    }

    try {
      const allowed: Record<string, any> = { updated_at: now }
      if (data.code !== undefined) allowed.code = data.code
      if (data.name !== undefined) allowed.name = data.name
      if (data.price !== undefined) allowed.price = data.price
      if (data.currency !== undefined) allowed.currency = data.currency
      if (data.duration_days !== undefined) allowed.duration_days = data.duration_days
      if (data.description !== undefined) allowed.description = data.description
      if (data.features !== undefined) allowed.features = JSON.stringify(data.features)
      if (data.is_active !== undefined) allowed.is_active = data.is_active ? 1 : 0
      if (data.is_recommended !== undefined) allowed.is_recommended = data.is_recommended ? 1 : 0
      if (data.max_devices !== undefined) allowed.max_devices = data.max_devices
      if (data.max_transactions_per_day !== undefined) allowed.max_transactions_per_day = data.max_transactions_per_day
      if (data.max_products !== undefined) allowed.max_products = data.max_products
      if (data.max_users !== undefined) allowed.max_users = data.max_users
      if (data.feature_flags !== undefined) allowed.feature_flags = JSON.stringify(data.feature_flags)
      if (data.sort_order !== undefined) allowed.sort_order = data.sort_order

      const entries = Object.entries(allowed)
      const fields = entries.map(([k]) => `${k} = ?`).join(', ')
      const vals = entries.map(([, v]) => v)
      sqlite.prepare(`UPDATE mediasoft_subscription_plans SET ${fields} WHERE id = ?`).run(...vals, id)
    } catch {
      const updates: Record<string, any> = { updated_at: now }
      if (data.name !== undefined) updates.name = data.name
      if (data.price !== undefined) updates.price = data.price
      if (data.duration_days !== undefined) updates.duration_days = data.duration_days
      if (data.features !== undefined) updates.features = JSON.stringify(data.features)
      if (data.is_active !== undefined) updates.is_active = data.is_active ? 1 : 0
      if (data.max_devices !== undefined) updates.max_devices = data.max_devices
      if (data.max_transactions_per_day !== undefined) updates.max_transactions_per_day = data.max_transactions_per_day
      if (data.max_products !== undefined) updates.max_products = data.max_products
      if (data.max_users !== undefined) updates.max_users = data.max_users
      if (data.feature_flags !== undefined) updates.feature_flags = JSON.stringify(data.feature_flags)
      if (data.is_recommended !== undefined) updates.is_recommended = data.is_recommended ? 1 : 0

      db.update(subscriptionPlans)
        .set(updates)
        .where(eq(subscriptionPlans.id, id))
        .run()
    }
  }

  /** Soft-delete: set is_active = 0 */
  static deactivate(id: number) {
    const now = new Date().toISOString()
    try {
      sqlite.prepare('UPDATE mediasoft_subscription_plans SET is_active = 0, updated_at = ? WHERE id = ?').run(now, id)
    } catch {
      db.update(subscriptionPlans)
        .set({ is_active: 0, updated_at: now })
        .where(eq(subscriptionPlans.id, id))
        .run()
    }
  }

  static getUsageCount(id: number): number {
    try {
      const row = sqlite
        .prepare('SELECT COUNT(*) AS total FROM mediasoft_pengguna WHERE subscription_plan_id = ?')
        .get(id) as { total?: number } | undefined
      return Number(row?.total ?? 0)
    } catch {
      return 0
    }
  }

  static delete(id: number) {
    try {
      sqlite.prepare('DELETE FROM mediasoft_subscription_plans WHERE id = ?').run(id)
    } catch {
      db.delete(subscriptionPlans)
        .where(eq(subscriptionPlans.id, id))
        .run()
    }
  }
}
