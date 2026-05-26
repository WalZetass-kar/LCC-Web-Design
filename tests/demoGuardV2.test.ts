import { afterEach, describe, expect, it } from 'vitest'
import { shouldBlockChannel } from '../src/backend/middleware/demoGuardV2'
import { demoSession } from '../src/backend/services/demoSessionManager'

afterEach(() => {
  demoSession.clearSession()
})

describe('demoGuardV2 role checks', () => {
  it('blocks demo users from mutations but allows reads', () => {
    demoSession.setSession('demo', 'demo')

    expect(shouldBlockChannel('barang:getAll')).toBe(false)
    expect(shouldBlockChannel('penjualan:create')).toBe(true)
    expect(shouldBlockChannel('plan:deactivate')).toBe(true)
  })

  it('blocks demo users from administration reads', () => {
    demoSession.setSession('demo', 'demo')

    expect(shouldBlockChannel('user:getAll')).toBe(true)
    expect(shouldBlockChannel('backup:getAll')).toBe(true)
    expect(shouldBlockChannel('security:get')).toBe(true)
    expect(shouldBlockChannel('plan:getAll')).toBe(true)
  })

  it('blocks demo users from mutation channels without generic suffixes', () => {
    demoSession.setSession('demo', 'demo')

    expect(shouldBlockChannel('barang:bulkImport')).toBe(true)
    expect(shouldBlockChannel('promo:apply')).toBe(true)
    expect(shouldBlockChannel('branch:transferStock')).toBe(true)
    expect(shouldBlockChannel('loyalty:redeemPoints')).toBe(true)
    expect(shouldBlockChannel('audit:log')).toBe(true)
    expect(shouldBlockChannel('strukSettings:uploadQris')).toBe(true)
    expect(shouldBlockChannel('user:extendAccess')).toBe(true)
    expect(shouldBlockChannel('user:block')).toBe(true)
  })

  it('blocks regular cashiers from administration channels', () => {
    demoSession.setSession('kasir', 'kasir')

    expect(shouldBlockChannel('user:getAll')).toBe(true)
    expect(shouldBlockChannel('backup:create')).toBe(true)
    expect(shouldBlockChannel('security:get')).toBe(true)
    expect(shouldBlockChannel('plan:getAll')).toBe(true)
    expect(shouldBlockChannel('plan:create')).toBe(true)
    expect(shouldBlockChannel('user:extendAccess')).toBe(true)
    expect(shouldBlockChannel('user:block')).toBe(true)
    expect(shouldBlockChannel('device:getAll')).toBe(true)
    expect(shouldBlockChannel('license:getConfig')).toBe(true)
    expect(shouldBlockChannel('popup:getAll')).toBe(true)
  })

  it('allows privileged users to access administration channels', () => {
    demoSession.setSession('owner', 'superadmin')

    expect(shouldBlockChannel('user:getAll')).toBe(false)
    expect(shouldBlockChannel('backup:create')).toBe(false)
    expect(shouldBlockChannel('security:get')).toBe(false)
    expect(shouldBlockChannel('plan:create')).toBe(false)
    expect(shouldBlockChannel('device:getAll')).toBe(false)
    expect(shouldBlockChannel('license:getConfig')).toBe(false)
    expect(shouldBlockChannel('popup:getAll')).toBe(false)
    expect(shouldBlockChannel('strukSettings:uploadQris')).toBe(false)
  })
})
