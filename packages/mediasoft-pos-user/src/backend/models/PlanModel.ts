import { db, sqlite } from '../../database/connection.js'
import { subscriptionPlans } from '../../database/schema.js'
import { eq } from 'drizzle-orm'

export interface PlanRow {
  id: number
  name: string
  price: number
  duration_days: number
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
}

export interface PlanInput {
  name: string
  price: number
  duration_days: number
  features: string[]
  is_active?: boolean
  is_recommended?: boolean
  max_devices?: number
  max_transactions_per_day?: number
  max_products?: number
  max_users?: number
  feature_flags?: Record<string, boolean>
}

export class PlanModel {
  /** Get all plans (including inactive — for admin view) */
  static getAll(): PlanRow[] {
    return db.select().from(subscriptionPlans).all() as PlanRow[]
  }

  /** Get only active plans (for pricing popup) */
  static getActive(): PlanRow[] {
    return db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.is_active, 1))
      .all() as PlanRow[]
  }

  /** Get a single plan by ID */
  static getById(id: number): PlanRow | undefined {
    return db.select().from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id))
      .get() as PlanRow | undefined
  }

  /** Create a new plan */
  static create(data: PlanInput) {
    const now = new Date().toISOString()

    // If this plan is recommended, un-recommend all others
    if (data.is_recommended) {
      db.update(subscriptionPlans)
        .set({ is_recommended: 0, updated_at: now })
        .run()
    }

    db.insert(subscriptionPlans).values({
      name: data.name,
      price: data.price,
      duration_days: data.duration_days,
      features: JSON.stringify(data.features),
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

  /** Update an existing plan */
  static update(id: number, data: Partial<PlanInput>) {
    const now = new Date().toISOString()
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

    // If setting as recommended, un-recommend all others first
    if (data.is_recommended !== undefined) {
      if (data.is_recommended) {
        db.update(subscriptionPlans)
          .set({ is_recommended: 0, updated_at: now })
          .run()
      }
      updates.is_recommended = data.is_recommended ? 1 : 0
    }

    db.update(subscriptionPlans)
      .set(updates)
      .where(eq(subscriptionPlans.id, id))
      .run()
  }

  /** Soft-delete: set is_active = 0 */
  static deactivate(id: number) {
    const now = new Date().toISOString()
    db.update(subscriptionPlans)
      .set({ is_active: 0, updated_at: now })
      .where(eq(subscriptionPlans.id, id))
      .run()
  }

  static getUsageCount(id: number): number {
    const row = sqlite
      .prepare('SELECT COUNT(*) AS total FROM mediasoft_pengguna WHERE subscription_plan_id = ?')
      .get(id) as { total?: number } | undefined
    return Number(row?.total ?? 0)
  }

  static delete(id: number) {
    db.delete(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id))
      .run()
  }
}
