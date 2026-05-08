import { sqlite } from '../../database/connection.js'

export interface LoyaltyTier {
  id: number
  name: string
  min_points: number
  discount_percent: number
  benefits: string
  color: string
}

export class LoyaltyService {
  /**
   * Get all loyalty tiers
   */
  static getTiers(): LoyaltyTier[] {
    return sqlite.prepare(`
      SELECT * FROM mediasoft_loyalty_tiers 
      ORDER BY min_points ASC
    `).all() as LoyaltyTier[]
  }

  /**
   * Get tier by points
   */
  static getTierByPoints(points: number): LoyaltyTier | null {
    return sqlite.prepare(`
      SELECT * FROM mediasoft_loyalty_tiers 
      WHERE min_points <= ?
      ORDER BY min_points DESC
      LIMIT 1
    `).get(points) as LoyaltyTier | null
  }

  /**
   * Update customer tier based on points
   */
  static updateCustomerTier(customerId: string) {
    try {
      // Get customer points
      const customer = sqlite.prepare(`
        SELECT poin FROM mediasoft_customer WHERE kd_customer = ?
      `).get(customerId) as { poin: number } | undefined

      if (!customer) return { success: false, message: 'Customer not found' }

      // Get appropriate tier
      const tier = this.getTierByPoints(customer.poin)
      if (!tier) return { success: false, message: 'No tier found' }

      // Update customer tier
      sqlite.prepare(`
        UPDATE mediasoft_customer 
        SET tier_id = ? 
        WHERE kd_customer = ?
      `).run(tier.id, customerId)

      return { success: true, tier }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Calculate points earned from purchase
   */
  static calculatePoints(amount: number, tierId: number = 1): number {
    // Base: 1 point per 10,000
    let points = Math.floor(amount / 10000)

    // Bonus points for higher tiers
    const bonusMultiplier: Record<number, number> = {
      1: 1,    // Bronze: 1x
      2: 1.2,  // Silver: 1.2x
      3: 1.5,  // Gold: 1.5x
      4: 2,    // Platinum: 2x
    }

    points = Math.floor(points * (bonusMultiplier[tierId] || 1))

    return points
  }

  /**
   * Get customer tier info
   */
  static getCustomerTierInfo(customerId: string) {
    try {
      const result = sqlite.prepare(`
        SELECT 
          c.kd_customer,
          c.nama_customer,
          c.poin,
          c.tier_id,
          t.name as tier_name,
          t.min_points,
          t.discount_percent,
          t.benefits,
          t.color as tier_color
        FROM mediasoft_customer c
        LEFT JOIN mediasoft_loyalty_tiers t ON c.tier_id = t.id
        WHERE c.kd_customer = ?
      `).get(customerId)

      if (!result) return { success: false, message: 'Customer not found' }

      // Get next tier
      const nextTier = sqlite.prepare(`
        SELECT * FROM mediasoft_loyalty_tiers 
        WHERE min_points > ?
        ORDER BY min_points ASC
        LIMIT 1
      `).get((result as any).poin) as LoyaltyTier | undefined

      return {
        success: true,
        data: {
          ...result,
          next_tier: nextTier,
          points_to_next: nextTier ? nextTier.min_points - (result as any).poin : 0,
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  /**
   * Redeem points for discount
   */
  static redeemPoints(customerId: string, points: number): { success: boolean; discount?: number; message?: string } {
    try {
      const customer = sqlite.prepare(`
        SELECT poin FROM mediasoft_customer WHERE kd_customer = ?
      `).get(customerId) as { poin: number } | undefined

      if (!customer) return { success: false, message: 'Customer not found' }
      if (customer.poin < points) return { success: false, message: 'Insufficient points' }

      // 1 point = Rp 1,000 discount
      const discount = points * 1000

      // Deduct points
      sqlite.prepare(`
        UPDATE mediasoft_customer 
        SET poin = poin - ? 
        WHERE kd_customer = ?
      `).run(points, customerId)

      // Update tier
      this.updateCustomerTier(customerId)

      return { success: true, discount }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
