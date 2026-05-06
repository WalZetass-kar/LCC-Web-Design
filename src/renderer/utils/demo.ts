/**
 * ═══════════════════════════════════════════════════════════════════════
 * DEMO UTILITY — Renderer-side demo mode helpers
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * NOTE: These checks are for UX only — NOT security.
 * Real security is enforced in the main process (ipcHandlers + demoGuardV2).
 * Even if someone bypasses these checks, the main process still blocks writes.
 */

/**
 * Check if the current user is in demo mode.
 * Reads from the session stored in localStorage (set by AuthContext).
 * 
 * WARNING: This is a UX check only. The renderer is untrusted.
 * An attacker could modify localStorage — that's OK because
 * the main process has its own independent check via demoSessionManager.
 */
export function isDemoMode(): boolean {
  try {
    const saved = localStorage.getItem('pos_session')
    if (!saved) return false
    const userData = JSON.parse(saved)
    return userData.hak_akses === 'demo'
  } catch {
    return false
  }
}

/**
 * Get the demo blocked message.
 */
export function getDemoBlockedMessage(action?: string): string {
  return `🔒 Mode Demo (READ ONLY): ${action ? `Tidak dapat ${action}.` : 'Aksi ini tidak diizinkan.'} Silakan login dengan akun biasa untuk menggunakan fitur penuh.`
}

/**
 * Check demo mode and return true if blocked.
 * Use this before performing any action in the UI.
 * 
 * @param action - Description of the action being attempted (for the message)
 * @returns true if demo mode is active (action should be blocked)
 */
export function checkDemoBlock(action?: string): boolean {
  return isDemoMode()
}

/**
 * List of mutation-related keywords.
 * Used by the API wrapper to pre-filter before sending to main process.
 */
export const MUTATION_KEYWORDS = [
  'create', 'update', 'delete', 'save', 'simpan', 'hapus', 'ubah',
  'buka', 'tutup', 'bayar', 'cicil', 'approve', 'reject', 'reset',
  'add', 'remove', 'set', 'toggle', 'import', 'restore', 'clear',
  'open', 'close', 'generate',
] as const
