import { sqlite } from '../../database/connection.js'

export interface Promo {
  id: number
  code: string
  name: string
  type: 'PERCENTAGE' | 'FIXED' | 'BUY_X_GET_Y' | 'BUNDLE' | 'HAPPY_HOUR'
  value: number
  min_purchase: number
  max_discount?: number
  start_date?: string
  end_date?: string
  start_time?: string
  end_time?: string
  usage_limit?: number
  usage_count: number
  is_active: number
  conditions?: string
}

export interface PromoValidation {
  valid: boolean
  discount: number
  message?: string
  promo?: Promo
}

export class PromoService {
  /**
   * Validate and apply promo code
   */
  static validatePromo(code: string, subtotal: number, items: any[]): PromoValidation {
    try {
      const promo = sqlite.prepare(`
        SELECT * FROM mediasoft_promos 
        WHERE code = ? AND is_active = 1
      `).get(code) as Promo | any

      if (!promo) {
        return { valid: false, discount: 0, message: 'Kode promo tidak valid' }
      }

      // Check date validity
      const now = new Date()
      const startDate = new Date(promo.start_date)
      const endDate = new Date(promo.end_date)

      if (promo.start_date && now < startDate) {
        return { valid: false, discount: 0, message: 'Promo belum dimulai' }
      }

      if (promo.end_date && now > endDate) {
        return { valid: false, discount: 0, message: 'Promo sudah berakhir' }
      }

      // Check Happy Hour
      if (promo.type === 'HAPPY_HOUR' && promo.start_time && promo.end_time) {
        const currentTime = now.getHours() * 60 + now.getMinutes()
        const [sH, sM] = promo.start_time.split(':').map(Number)
        const [eH, eM] = promo.end_time.split(':').map(Number)
        const startTime = sH * 60 + sM
        const endTime = eH * 60 + eM

        if (currentTime < startTime || currentTime > endTime) {
          return { valid: false, discount: 0, message: `Promo hanya berlaku pukul ${promo.start_time} - ${promo.end_time}` }
        }
      }

      // Check usage limit
      if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
        return { valid: false, discount: 0, message: 'Kuota promo sudah habis' }
      }

      // Check minimum purchase
      if (subtotal < promo.min_purchase) {
        return {
          valid: false,
          discount: 0,
          message: `Minimum pembelian Rp ${promo.min_purchase.toLocaleString()}`,
        }
      }

      // Calculate discount
      let discount = 0

      switch (promo.type) {
        case 'PERCENTAGE':
        case 'HAPPY_HOUR':
          discount = (subtotal * promo.value) / 100
          if (promo.max_discount && discount > promo.max_discount) {
            discount = promo.max_discount
          }
          break

        case 'FIXED':
          discount = promo.value
          break

        case 'BUY_X_GET_Y':
          // Conditions: { buy: 2, get: 1, product_id: 'P001' }
          if (promo.conditions) {
            const cond = typeof promo.conditions === 'string' ? JSON.parse(promo.conditions) : promo.conditions
            const targetItem = items.find(i => i.kd_barang === cond.product_id)
            if (targetItem && targetItem.qty >= cond.buy) {
              const freeQty = Math.floor(targetItem.qty / cond.buy) * cond.get
              discount = freeQty * targetItem.harga_jual
            }
          }
          break

        case 'BUNDLE':
          // Conditions: { products: ['P001', 'P002'], discount: 50000 }
          if (promo.conditions) {
            const cond = typeof promo.conditions === 'string' ? JSON.parse(promo.conditions) : promo.conditions
            const hasAllProducts = cond.products.every((pid: string) =>
              items.some(i => i.kd_barang === pid)
            )
            if (hasAllProducts) {
              discount = cond.discount
            }
          }
          break
      }

      return {
        valid: true,
        discount: Math.min(discount, subtotal),
        promo,
      }
    } catch (error) {
      return { valid: false, discount: 0, message: String(error) }
    }
  }

  /**
   * Apply promo (increment usage count)
   */
  static applyPromo(code: string) {
    try {
      sqlite.prepare(`
        UPDATE mediasoft_promos 
        SET usage_count = usage_count + 1 
        WHERE code = ?
      `).run(code)

      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Get active promos
   */
  static getActivePromos() {
    try {
      const now = new Date().toISOString()
      const promos = sqlite.prepare(`
        SELECT * FROM mediasoft_promos 
        WHERE is_active = 1 
        AND start_date <= ? 
        AND end_date >= ?
        ORDER BY created_at DESC
      `).all(now, now)

      return { success: true, data: promos }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Create promo
   */
  static createPromo(data: Omit<Promo, 'id' | 'usage_count' | 'created_at'>) {
    try {
      const now = new Date().toISOString()
      sqlite.prepare(`
        INSERT INTO mediasoft_promos 
        (code, name, type, value, min_purchase, max_discount, start_date, end_date, usage_limit, is_active, conditions, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.code,
        data.name,
        data.type,
        data.value,
        data.min_purchase,
        data.max_discount || null,
        data.start_date,
        data.end_date,
        data.usage_limit || null,
        data.is_active,
        data.conditions || null,
        now
      )

      return { success: true, message: 'Promo berhasil dibuat' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Update promo
   */
  static updatePromo(id: number, data: Partial<Promo>) {
    try {
      const fields: string[] = []
      const values: any[] = []

      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at' && value !== undefined) {
          fields.push(`${key} = ?`)
          values.push(value)
        }
      })

      if (fields.length === 0) {
        return { success: false, message: 'No fields to update' }
      }

      values.push(id)
      sqlite.prepare(`
        UPDATE mediasoft_promos 
        SET ${fields.join(', ')}
        WHERE id = ?
      `).run(...values)

      return { success: true, message: 'Promo berhasil diupdate' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Delete promo
   */
  static deletePromo(id: number) {
    try {
      sqlite.prepare('DELETE FROM mediasoft_promos WHERE id = ?').run(id)
      return { success: true, message: 'Promo berhasil dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
