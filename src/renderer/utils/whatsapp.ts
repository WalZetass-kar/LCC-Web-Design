/**
 * ═══════════════════════════════════════════════════════════════════════
 * WHATSAPP HELPER — Reusable WhatsApp redirect utility
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Centralized handler for opening WhatsApp with pre-filled messages.
 * Used by the pricing popup to direct demo users to the admin/owner.
 *
 * Format: https://wa.me/<number>?text=<encoded_text>
 *
 * Best practice:
 * - Number stored in DB (Identitas.nomorwaowner), NOT hardcoded
 * - Fallback number configurable here for safety
 * - Message auto-populated with user + plan context
 */

/** Fallback WhatsApp number if DB returns null */
const FALLBACK_WA_NUMBER = '6281234567890'

/**
 * Normalize a phone number to international format (without +).
 * Handles common Indonesian formats:
 *   08xxx → 628xxx
 *   +628xxx → 628xxx
 *   628xxx → 628xxx (unchanged)
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
  // Convert local format to international
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  }
  return cleaned
}

export interface WhatsAppUpgradeParams {
  /** Owner/admin phone number (will be normalized) */
  phone?: string | null
  /** Selected plan name (e.g., "Bulanan") */
  planName: string
  /** Plan price formatted (e.g., "Rp 299.000") */
  planPrice: string
  /** Plan period (e.g., "/bulan") */
  planPeriod: string
  /** Demo user's display name */
  userName: string
  /** Store/business name (from Identitas) */
  storeName?: string | null
  /** User's email (optional) */
  email?: string | null
}

/**
 * Build a pre-filled WhatsApp message for upgrade intent.
 * Structured for easy parsing by the admin.
 */
export function buildUpgradeMessage(params: WhatsAppUpgradeParams): string {
  const lines: string[] = [
    `Halo Admin, saya ingin upgrade paket MediaSoft POS 🚀`,
    ``,
    `📋 *Detail Pesanan:*`,
    `• Paket: *${params.planName}* (${params.planPrice}${params.planPeriod})`,
    `• Nama: ${params.userName}`,
  ]

  if (params.storeName) {
    lines.push(`• Toko: ${params.storeName}`)
  }
  if (params.email) {
    lines.push(`• Email: ${params.email}`)
  }

  lines.push(
    ``,
    `Mohon info cara pembayaran dan aktivasinya. Terima kasih! 🙏`,
  )

  return lines.join('\n')
}

/**
 * Open WhatsApp with a pre-filled upgrade message.
 * Works on both desktop (wa.me redirect) and mobile (WhatsApp app).
 *
 * @returns true if successfully opened, false if number is invalid
 */
export function openWhatsAppUpgrade(params: WhatsAppUpgradeParams): boolean {
  const rawPhone = params.phone || FALLBACK_WA_NUMBER
  const phone = normalizePhoneNumber(rawPhone)

  // Basic validation
  if (phone.length < 10 || !/^\d+$/.test(phone)) {
    console.error('[WhatsApp] Invalid phone number:', phone)
    return false
  }

  const message = buildUpgradeMessage(params)
  const encodedMessage = encodeURIComponent(message)
  const url = `https://wa.me/${phone}?text=${encodedMessage}`

  // Use window.open for Electron compatibility
  window.open(url, '_blank')
  return true
}

/**
 * Open WhatsApp with a custom message (generic helper).
 */
export function openWhatsApp(phone: string, message: string): void {
  const normalized = normalizePhoneNumber(phone)
  const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}
