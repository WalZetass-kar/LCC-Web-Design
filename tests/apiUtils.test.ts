import { describe, it, expect } from 'vitest'

const READ_PATTERNS = [
  'getAll', 'get', 'search', 'getDetail', 'getById',
  'getSummary', 'getLaporan', 'getActive', 'getUnread',
  'check', 'download', 'export', 'print',
  'getRiwayat', 'getByProduct', 'getItems', 'getPayments',
  'getCurrent', 'getByModul', 'getByUsername', 'getMigrationStatus',
  'getSettings', 'getPermissions', 'getBirthdayToday',
  'getTransaksi', 'getKasById', 'getAllKas', 'getActiveKas',
  'getUnreadCount', 'getHistory', 'getDetails', 'getUsageCount',
  'calculate', 'ask', 'testAi', 'listAiModels',
] as const

function isReadChannel(channel: string): boolean {
  if (channel.startsWith('auth:') || channel.startsWith('demo:')) return true
  if (channel.startsWith('laporan:') || channel.startsWith('export:')) return true
  return READ_PATTERNS.some(p => channel.includes(p))
}

describe('API Channel Utils', () => {
  it('auth: selalu read', () => expect(isReadChannel('auth:login')).toBe(true))
  it('laporan: selalu read', () => expect(isReadChannel('laporan:getSales')).toBe(true))
  it('getAll adalah read', () => expect(isReadChannel('barang:getAll')).toBe(true))
  it('create bukan read', () => expect(isReadChannel('penjualan:create')).toBe(false))
  it('delete bukan read', () => expect(isReadChannel('barang:delete')).toBe(false))
  it('update bukan read', () => expect(isReadChannel('customer:update')).toBe(false))
  it('search adalah read', () => expect(isReadChannel('customer:search')).toBe(true))
})
