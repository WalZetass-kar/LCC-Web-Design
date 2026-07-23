import { describe, it, expect } from 'vitest'
import { formatRupiah, formatDate, formatDateTime } from '../src/renderer/utils/format'

describe('formatRupiah', () => {
  it('formats zero', () => {
    const result = formatRupiah(0)
    expect(result).toContain('Rp')
    expect(result).toContain('0')
  })

  it('formats positive numbers with thousands separator', () => {
    const result = formatRupiah(1000)
    expect(result).toContain('Rp')
    expect(result).toContain('1')
    expect(result.length).toBeGreaterThan(4)
  })

  it('handles null and undefined as zero', () => {
    expect(formatRupiah(null)).toContain('0')
    expect(formatRupiah(undefined)).toContain('0')
  })

  it('formats large numbers', () => {
    const result = formatRupiah(1000000000)
    expect(result).toContain('Rp')
    expect(result).toContain('1')
  })
})

describe('formatDate', () => {
  it('returns dash for null/undefined', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate(undefined)).toBe('-')
  })

  it('formats valid date strings with day and year', () => {
    const result = formatDate('2024-06-15T12:00:00')
    expect(result).toContain('2024')
    expect(result).toContain('Jun')
  })
})

describe('formatDateTime', () => {
  it('returns dash for null/undefined', () => {
    expect(formatDateTime(null)).toBe('-')
    expect(formatDateTime(undefined)).toBe('-')
  })

  it('formats datetime strings with year', () => {
    const result = formatDateTime('2024-06-15T10:30:00')
    expect(result).toContain('2024')
  })
})
