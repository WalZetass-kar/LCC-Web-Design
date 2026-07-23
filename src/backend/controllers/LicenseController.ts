import { sqlite } from '../../database/connection.js'
import { PenggunaModel } from '../models/PenggunaModel.js'
import {
  syncBuyerLicense as fbSyncBuyerLicense,
  heartbeat as fbHeartbeat
} from '../../shared/supabase/license.js'
import { isLicenseSessionExpiredResult } from '../../shared/licenseSession.js'

type ApiResult<T = unknown> = { success: boolean; data?: T; message?: string }

function getPublicLicenseUrl(): string | null {
  return process.env.VITE_SUPABASE_URL || null
}

function getConfig(): { url: string; token: string; refreshToken?: string | null } | null {
  try {
    const row = sqlite
      .prepare(`SELECT license_server_url, license_admin_token, license_admin_refresh_token FROM mediasoft_identitas LIMIT 1`)
      .get() as { license_server_url?: string; license_admin_token?: string; license_admin_refresh_token?: string | null } | undefined
    if (!row?.license_server_url) return { url: getPublicLicenseUrl() || '', token: '', refreshToken: null }
    return { url: row.license_server_url.replace(/\/$/, ''), token: row.license_admin_token || '', refreshToken: row.license_admin_refresh_token ?? null }
  } catch {
    return { url: getPublicLicenseUrl() || '', token: '', refreshToken: null }
  }
}

function saveConfig(url: string, token: string, refreshToken?: string | null) {
  const run = sqlite.transaction(() => {
    const existing = sqlite.prepare(`SELECT kode FROM mediasoft_identitas LIMIT 1`).get() as { kode?: number } | undefined
    if (existing?.kode) {
      sqlite.prepare(`UPDATE mediasoft_identitas SET license_server_url = ?, license_admin_token = ?, license_admin_refresh_token = COALESCE(?, license_admin_refresh_token) WHERE kode = ?`)
        .run(url, token, refreshToken ?? null, existing.kode)
      return
    }
    sqlite.prepare(`INSERT INTO mediasoft_identitas (kode, license_server_url, license_admin_token, license_admin_refresh_token) VALUES (1, ?, ?, ?)`)
      .run(url, token, refreshToken ?? null)
  })
  run()
}

function normalizeLicenseBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return ''

  let parsed: URL
  try { parsed = new URL(trimmed) }
  catch { return trimmed }

  const path = parsed.pathname.replace(/\/+$/, '')
  const isSupabaseProjectRoot = parsed.hostname.endsWith('.supabase.co') && (path === '' || path === '/')
  if (isSupabaseProjectRoot) {
    return `${parsed.origin}/functions/v1/mediasoft-license`
  }

  if (path.includes('/functions/v1/')) return trimmed
  if (path.endsWith('/api')) return trimmed

  return `${trimmed}/api`
}

async function request<T = unknown>(method: string, path: string, token: string, baseUrl: string, body?: unknown): Promise<T> {
  const fullUrl = `${baseUrl}${path}`
  const payload = body ? JSON.stringify(body) : undefined

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: payload,
      signal: controller.signal,
    })

    const text = await res.text()
    try {
      return JSON.parse(text) as T
    } catch {
      const preview = text.slice(0, 150).replace(/\s+/g, ' ')
      throw new Error(`Server tidak merespons dengan JSON. Status: ${res.status}. Response: ${preview}`)
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error(`Timeout: server tidak merespons dalam 10 detik`)
    }
    const causeMsg = (e.cause && typeof e.cause === 'object' ? (e.cause as any).message : null) || e.message
    let hostname = ''
    try { hostname = new URL(fullUrl).hostname } catch {}
    const localHint = ['localhost', '127.0.0.1', '::1'].includes(hostname)
      ? '. Untuk dev lokal, jalankan: npm --prefix license-server run dev'
      : ''
    throw new Error(`Tidak dapat terhubung ke ${hostname}${localHint} — ${causeMsg}`)
  } finally {
    clearTimeout(timeout)
  }
}

async function refreshAdminToken(cfg: { url: string; refreshToken?: string | null }): Promise<string | null> {
  if (!cfg.refreshToken) return null
  const refresh = await request<ApiResult<any>>('POST', '/auth/refresh', '', cfg.url, { refresh_token: cfg.refreshToken })
  if (!refresh.success || !refresh.data?.access_token) return null
  const accessToken = String(refresh.data.access_token)
  const newRefreshToken = refresh.data.refresh_token ? String(refresh.data.refresh_token) : cfg.refreshToken
  saveConfig(cfg.url, accessToken, newRefreshToken)
  return accessToken
}

async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const cfg = getConfig()
  if (!cfg?.url) return { success: false, message: 'License server belum dikonfigurasi. Buka tab Koneksi.' }
  try {
    const result = await request<ApiResult<T>>(method, path, cfg.token, cfg.url, body)
    if (!result.success && isLicenseSessionExpiredResult(result)) {
      const refreshedToken = await refreshAdminToken(cfg)
      if (refreshedToken) return await request<ApiResult<T>>(method, path, refreshedToken, cfg.url, body)
    }
    return result
  } catch (e: any) {
    return { success: false, message: e?.message || 'Gagal menghubungi license server' }
  }
}

export class LicenseController {
  static getPublicEndpoint() {
    return getPublicLicenseUrl()
  }

  static getConfig() {
    const cfg = getConfig()
    return {
      success: true,
      data: cfg
        ? { url: cfg.url, connected: true, hasRefreshToken: Boolean(cfg.refreshToken) }
        : { url: '', connected: false, hasRefreshToken: false },
    }
  }

  static async checkBuyerLicense(email: string, deviceInfo?: unknown): Promise<ApiResult<any> | null> {
    const r = await fbSyncBuyerLicense({ email, deviceInfo: deviceInfo as any })
    return { success: r.success, data: r.data as any, message: (r as any).message }
  }

  static async syncBuyerLicense(username: string, deviceInfo?: unknown): Promise<ApiResult<any>> {
    const user = sqlite
      .prepare(`SELECT nama_pengguna, email, is_buyer FROM mediasoft_pengguna WHERE nama_pengguna = ? LIMIT 1`)
      .get(username) as { nama_pengguna?: string; email?: string | null; is_buyer?: number | null } | undefined

    if (!user?.nama_pengguna || !user.is_buyer || !user.email) {
      return { success: true, data: { skipped: true, reason: 'not_remote_buyer' } }
    }

    const r = await fbSyncBuyerLicense({ email: user.email, deviceInfo: deviceInfo as any })
    if (!r.success) {
      const code = String((r as any).error_code ?? '').toUpperCase()
      if (['BLOCKED', 'SUSPENDED', 'INACTIVE', 'DEVICE_BLOCKED', 'EXPIRED'].includes(code)) {
        sqlite.prepare(`UPDATE mediasoft_pengguna SET status_user = 'Nonaktif' WHERE nama_pengguna = ?`).run(username)
      }
    }
    return { success: r.success, data: { ...(r.data as any), synced_at: new Date().toISOString() }, message: (r as any).message }
  }

  static async loginAdmin(...args: any[]) { return { success: false, message: 'Deprecated API', data: {} as any } }
  static async loginBuyer(...args: any[]) { return { success: false, message: 'Deprecated API', data: {} as any } }
  static saveAdminSessionFromRemote(...args: any[]) { return null }
  static async registerTrialCustomer(...args: any[]) { return { success: false, message: 'Deprecated API', data: {} as any } }
  static async changePassword(...args: any[]) { return { success: false, message: 'Deprecated API', data: {} as any } }

  static async testConnection(url?: string) {
    const rawUrl = (url || '').trim()
    if (!rawUrl) return { success: false, message: 'URL license server belum diisi' }

    const apiBase = normalizeLicenseBaseUrl(rawUrl)
    try {
      const result = await request<ApiResult<{ time?: string }>>('GET', '/health', '', apiBase)
      return {
        success: !!result?.success,
        data: result?.data ?? null,
        message: result?.success ? 'License server dapat dijangkau' : result?.message || 'License server tidak valid',
      }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal menghubungi license server' }
    }
  }

  static async testAndSave(url: string, email: string, password: string) {
    const apiBase = normalizeLicenseBaseUrl(url)
    try {
      const loginRes = await request<ApiResult<{ access_token: string; refresh_token?: string; user: { role: string } }>>(
        'POST', '/auth/login', '', apiBase,
        { email, password, device_id: 'pos-app-developer', device_name: 'Zetass Pos Developer', platform: 'electron' }
      )
      if (!loginRes?.data?.access_token) {
        return { success: false, message: loginRes?.message || 'Login gagal — periksa email dan password' }
      }
      if (!['admin', 'super_admin', 'developer'].includes(loginRes.data.user?.role ?? '')) {
        return { success: false, message: 'Akun ini bukan admin di license server' }
      }
      saveConfig(apiBase, loginRes.data.access_token, loginRes.data.refresh_token ?? null)
      return { success: true, message: 'Berhasil terhubung ke license server' }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Tidak dapat terhubung' }
    }
  }

  static async validateApplication() {
    const cfg = getConfig()
    if (!cfg?.url) return { success: false, message: 'License server belum dikonfigurasi' }
    const health = await this.testConnection(cfg.url)
    if (!health.success) return health
    return { success: true, data: { url: cfg.url, connected: true, checked_at: new Date().toISOString() }, message: 'Validasi koneksi license API berhasil' }
  }

  static async syncFromServer() {
    const plans = await call<any[]>('GET', '/admin/plans')
    if (!plans.success) return plans
    const count = (plans.data ?? []).length
    return { success: true, message: `Sync lisensi selesai: ${count} paket diproses`, data: { plans: count } }
  }

  static async createPaymentInvoice(data: { email?: string; customer_id?: string; plan_code: string; notes?: string }) {
    return call('POST', '/payments/create', data)
  }

  static async createManualPaymentRequest(data: { email?: string; customer_id?: string; plan_code: string; notes?: string }) {
    return call('POST', '/payments/manual-request', data)
  }

  static async getPaymentStatus(externalRef: string) {
    if (!externalRef?.trim()) return { success: false, message: 'Nomor invoice tidak valid' }
    return call('GET', `/payments/status?external_ref=${encodeURIComponent(externalRef)}`)
  }

  static async getPublicPlans() { return call('GET', '/plans') }
  static async getPublicPopup(code: string) { return call('GET', `/popup/${encodeURIComponent(String(code ?? '').trim())}`) }
  static async getUsers(search?: string) { return call('GET', `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`) }
  static async createUser(data: unknown) { return call('POST', '/admin/users', data) }
  static async updateUser(id: string | number, data: unknown) { return call('PATCH', `/admin/users/${id}`, data) }
  static async deleteUser(id: string | number) { return call('DELETE', `/admin/users/${id}`) }
  static async changeUserPlan(id: string | number, data: unknown) { return call('PUT', `/admin/users/${id}/plan`, data) }
  static async resetUserPassword(id: string | number) {
    const res = await call<any>('POST', `/admin/users/${id}/reset-password`, {})
    if (res?.success && res?.data) {
      const newPwd = res.data.new_password || res.data.password
      if (newPwd) {
        try {
          const userRes = await call<any>('GET', `/admin/users/${id}`)
          const userEmail = userRes?.data?.user?.email
          if (userEmail) {
            const localUser = sqlite.prepare(`SELECT nama_pengguna FROM mediasoft_pengguna WHERE lower(email) = lower(?) LIMIT 1`).get(userEmail) as { nama_pengguna?: string } | undefined
            if (localUser?.nama_pengguna) {
              await PenggunaModel.updatePassword(localUser.nama_pengguna, newPwd, false)
            }
          }
        } catch (err) {
          console.warn('[resetUserPassword] Sync local password skipped:', err)
        }
      }
    }
    return res
  }
  static async getLicensePlans() { return call('GET', '/admin/plans') }
  static async createLicensePlan(data: unknown) { return call('POST', '/admin/plans', data) }
  static async updateLicensePlan(id: string | number, data: unknown) { return call('PATCH', `/admin/plans/${id}`, data) }
  static async deleteLicensePlan(id: string | number) { return call('DELETE', `/admin/plans/${id}`) }
  static async getPlanFeatures(planId: string | number) { return call('GET', `/admin/plans/${planId}/features`) }
  static async setPlanFeatures(planId: string | number, data: unknown) { return call('PUT', `/admin/plans/${planId}/features`, data) }
  static async getLicenseFeatures() { return call('GET', '/admin/features') }
  static async createLicenseFeature(data: unknown) { return call('POST', '/admin/features', data) }
  static async updateLicenseFeature(id: string | number, data: unknown) { return call('PATCH', `/admin/features/${id}`, data) }
  static async getPopups() { return call('GET', '/admin/popups') }
  static async updatePopup(id: string | number, data: unknown) { return call('PATCH', `/admin/popups/${id}`, data) }
  static async getPayments() { return call('GET', '/admin/payments') }
  static async createPayment(data: unknown) { return call('POST', '/admin/payments', data) }
  static async approvePayment(id: string | number) { return call('POST', `/admin/payments/${id}/approve`) }
  static async deletePayment(id: string | number) { return call('DELETE', `/admin/payments/${id}`) }
  static async getStats() { return call('GET', '/admin/stats') }
  static async getRevenue() { return call('GET', '/admin/revenue') }
  static async getDevices(query?: { search?: string; status?: string; platform?: string }) {
    const params = new URLSearchParams()
    if (query?.search) params.set('search', query.search)
    if (query?.status) params.set('status', query.status)
    if (query?.platform) params.set('platform', query.platform)
    return call('GET', `/admin/devices${params.toString() ? `?${params.toString()}` : ''}`)
  }
  static async getDeviceDetail(id: string | number) { return call('GET', `/admin/devices/${id}`) }
  static async blockDevice(id: string | number) { return call('POST', `/admin/devices/${id}/block`) }
  static async unblockDevice(id: string | number) { return call('POST', `/admin/devices/${id}/unblock`) }
  static async suspendDeviceLicense(id: string | number) { return call('POST', `/admin/devices/${id}/suspend-license`) }
  static async activateDeviceLicense(id: string | number) { return call('POST', `/admin/devices/${id}/activate-license`) }
  static async extendDeviceLicense(id: string | number, data: unknown) { return call('POST', `/admin/devices/${id}/extend-license`, data) }
  static async getAppUpdates() { return call('GET', '/admin/app-update') }
  static async saveAppUpdate(data: unknown) { return call('PATCH', '/admin/app-update', data) }
  static async checkAppUpdate(data: unknown) {
    const cfg = getConfig()
    if (!cfg?.url) return { success: false, message: 'License server belum dikonfigurasi' }
    return request<ApiResult<any>>('POST', '/app-update', '', cfg.url, data)
  }
  static async getErrors(query?: { type?: string }) {
    const params = new URLSearchParams()
    if (query?.type) params.set('type', query.type)
    return call('GET', `/admin/errors${params.toString() ? `?${params.toString()}` : ''}`)
  }
  static async getAnnouncements() { return call('GET', '/admin/announcements') }
  static async createAnnouncement(data: unknown) { return call('POST', '/admin/announcements', data) }
  static async updateAnnouncement(id: string | number, data: unknown) { return call('PATCH', `/admin/announcements/${id}`, data) }
  static async deleteAnnouncement(id: string | number) { return call('DELETE', `/admin/announcements/${id}`) }
  static async heartbeat(data: unknown, _token?: string | null) {
    const d = (data && typeof data === 'object' ? data : {}) as any
    await fbHeartbeat({ email: d.email, customerId: d.customer_id ?? d.auth_user_id, deviceInfo: d.device ?? d })
    return { success: true }
  }
  static async logError(data: unknown) {
    const d = (data && typeof data === 'object' ? data : {}) as any
    const { logActivity } = await import('../../shared/supabase/logging.js')
    await logActivity({
      username: d.email ?? d.username ?? 'unknown',
      action: 'APP_ERROR',
      module: 'SYSTEM',
      detail: `${d.error_type ?? 'error'}: ${String(d.error_message ?? '').slice(0, 1000)}`,
      deviceId: d.device_id,
      userAgent: d.user_agent,
    })
    return { success: true }
  }
}
