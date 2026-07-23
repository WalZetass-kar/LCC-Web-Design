export function escapeHtml(str: unknown): string {
  const s = String(str ?? '')
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export function sanitizeText(str: unknown): string {
  const s = String(str ?? '').trim()
  return s.replace(/[<>&"']/g, '').replace(/\s+/g, ' ')
}

export function sanitizePhoneNumber(phone: unknown): string {
  return String(phone ?? '').replace(/[^0-9+]/g, '').trim()
}
