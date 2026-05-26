/**
 * LicenseController — forward request ke license server via HTTP.
 * URL dan token admin disimpan di tabel mediasoft_identitas.
 */
import https from 'https'
import http from 'http'
import { sqlite } from '../../database/connection.js'

const DEFAULT_LICENSE_SERVER_URL = 'https://azhkvmkmimepmflzqqty.supabase.co/functions/v1/mediasoft-license'

function getConfig(): { url: string; token: string } | null {
  try {
    const row = sqlite
      .prepare(`SELECT license_server_url, license_admin_token FROM mediasoft_identitas LIMIT 1`)
      .get() as { license_server_url?: string; license_admin_token?: string } | undefined
    if (!row?.license_server_url || !row?.license_admin_token) return null
    return { url: row.license_server_url.replace(/\/$/, ''), token: row.license_admin_token }
  } catch {
    return null
  }
}

function saveConfig(url: string, token: string) {
  const existing = sqlite.prepare(`SELECT kode FROM mediasoft_identitas LIMIT 1`).get() as { kode?: number } | undefined
  if (existing?.kode) {
    sqlite.prepare(`UPDATE mediasoft_identitas SET license_server_url = ?, license_admin_token = ? WHERE kode = ?`)
      .run(url, token, existing.kode)
    return
  }
  sqlite.prepare(`INSERT INTO mediasoft_identitas (kode, license_server_url, license_admin_token) VALUES (1, ?, ?)`)
    .run(url, token)
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

function request<T = unknown>(method: string, path: string, token: string, baseUrl: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const fullUrl = `${baseUrl}${path}`
    const payload = body ? JSON.stringify(body) : undefined

    let parsed: URL
    try { parsed = new URL(fullUrl) }
    catch { return reject(new Error(`URL tidak valid: ${fullUrl}`)) }

    const isHttps = parsed.protocol === 'https:'
    const port = parsed.port ? Number(parsed.port) : (isHttps ? 443 : 80)

    const options = {
      hostname: parsed.hostname,
      port,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }

    const lib = isHttps ? https : http
    const req = lib.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as T)
        } catch {
          // Server mengembalikan non-JSON (HTML error page, dll)
          const preview = data.slice(0, 150).replace(/\s+/g, ' ')
          reject(new Error(`Server tidak merespons dengan JSON. Status: ${res.statusCode}. Response: ${preview}`))
        }
      })
    })
    req.on('error', (e: NodeJS.ErrnoException) => {
      const localHint = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
        ? '. Untuk dev lokal, jalankan license server: npm --prefix license-server run dev'
        : ''
      const reason = e.code === 'ECONNREFUSED'
        ? `Koneksi ditolak. License server belum berjalan di ${parsed.hostname}:${port}${localHint}`
        : `Tidak dapat terhubung ke ${parsed.hostname}:${port} — ${e.message}${localHint}`
      reject(new Error(reason))
    })
    req.setTimeout(10000, () => { req.destroy(); reject(new Error(`Timeout: server tidak merespons dalam 10 detik`)) })
    if (payload) req.write(payload)
    req.end()
  })
}

type ApiResult<T = unknown> = { success: boolean; data?: T; message?: string }

function getPublicLicenseUrl(): string | null {
  const envUrl = (
    process.env.MEDIASOFT_LICENSE_SERVER_URL ||
    process.env.SUPABASE_LICENSE_SERVER_URL ||
    process.env.VITE_LICENSE_SERVER_URL ||
    ''
  ).trim()
  if (envUrl) return normalizeLicenseBaseUrl(envUrl)

  try {
    const row = sqlite
      .prepare(`SELECT license_server_url FROM mediasoft_identitas LIMIT 1`)
      .get() as { license_server_url?: string } | undefined
    return row?.license_server_url ? normalizeLicenseBaseUrl(row.license_server_url) : DEFAULT_LICENSE_SERVER_URL
  } catch {
    return DEFAULT_LICENSE_SERVER_URL
  }
}

async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const cfg = getConfig()
  if (!cfg) return { success: false, message: 'License server belum dikonfigurasi. Buka License Center → tab Koneksi.' }
  try {
    return await request<ApiResult<T>>(method, path, cfg.token, cfg.url, body)
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
    return { success: true, data: cfg ? { url: cfg.url, connected: true } : { url: '', connected: false } }
  }

  static async registerTrialCustomer(data: {
    email: string
    password: string
    nama_lengkap: string
    no_telp?: string
  }, deviceInfo?: unknown): Promise<ApiResult<any> | null> {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return null

    try {
      return await request<ApiResult<any>>('POST', '/register-trial', '', endpoint, {
        email: data.email,
        password: data.password,
        name: data.nama_lengkap,
        phone: data.no_telp ?? null,
        device: deviceInfo ?? {},
      })
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal daftar trial ke license server pusat' }
    }
  }

  static async loginBuyer(data: {
    email: string
    password: string
  }, deviceInfo?: unknown): Promise<ApiResult<any> | null> {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return null

    try {
      return await request<ApiResult<any>>('POST', '/customer/login', '', endpoint, {
        email: data.email,
        password: data.password,
        device: deviceInfo ?? {},
      })
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal login ke license server pusat' }
    }
  }

  static async testConnection(url?: string) {
    const cfg = getConfig()
    const rawUrl = (url || cfg?.url || '').trim()
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
      const loginRes = await request<ApiResult<{ access_token: string; user: { role: string } }>>(
        'POST', '/auth/login', '', apiBase,
        { email, password, device_id: 'pos-app-developer', device_name: 'MediaSoft POS Developer', platform: 'electron' }
      )
      if (!loginRes?.data?.access_token) {
        return { success: false, message: loginRes?.message || 'Login gagal — periksa email dan password' }
      }
      if (!['admin', 'super_admin'].includes(loginRes.data.user?.role ?? '')) {
        return { success: false, message: 'Akun ini bukan admin di license server' }
      }
      saveConfig(apiBase, loginRes.data.access_token)
      return { success: true, message: 'Berhasil terhubung ke license server' }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Tidak dapat terhubung' }
    }
  }

  static async validateApplication() {
    const cfg = getConfig()
    if (!cfg) return { success: false, message: 'License server belum dikonfigurasi' }
    const health = await this.testConnection(cfg.url)
    if (!health.success) return health
    return {
      success: true,
      data: {
        url: cfg.url,
        connected: true,
        checked_at: new Date().toISOString(),
      },
      message: 'Validasi koneksi license API berhasil',
    }
  }

  static async syncFromServer() {
    const plans = await call<any[]>('GET', '/admin/plans')
    if (!plans.success) return plans

    const now = new Date().toISOString()
    const findPlan = sqlite.prepare(`SELECT id FROM mediasoft_subscription_plans WHERE name = ? LIMIT 1`)
    const insertPlan = sqlite.prepare(`
      INSERT INTO mediasoft_subscription_plans
        (name, price, duration_days, features, is_active, is_recommended, created_at, updated_at,
         max_devices, max_transactions_per_day, max_products, max_users, feature_flags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const updatePlan = sqlite.prepare(`
      UPDATE mediasoft_subscription_plans
      SET price = ?,
          duration_days = ?,
          features = ?,
          is_active = ?,
          is_recommended = ?,
          updated_at = ?,
          max_devices = ?,
          max_transactions_per_day = ?,
          max_products = ?,
          max_users = ?,
          feature_flags = ?
      WHERE id = ?
    `)

    try {
      const tx = sqlite.transaction((rows: any[]) => {
        for (const p of rows) {
          const name = p.name ?? p.code ?? 'Paket'
          const price = Math.round(Number(p.price ?? 0))
          const duration = Math.max(1, Math.trunc(Number(p.duration_days ?? 30)))
          const features = JSON.stringify(Array.isArray(p.features) ? p.features : (p.description ? [String(p.description)] : []))
          const active = p.is_active === false || p.is_active === 0 ? 0 : 1
          const recommended = p.is_recommended === true || p.is_recommended === 1 ? 1 : 0
          const maxDevices = Number.isFinite(Number(p.max_devices)) ? Math.trunc(Number(p.max_devices)) : 1
          const maxTransactions = Number.isFinite(Number(p.max_transactions_per_day)) ? Math.trunc(Number(p.max_transactions_per_day)) : -1
          const maxProducts = Number.isFinite(Number(p.max_products)) ? Math.trunc(Number(p.max_products)) : -1
          const maxUsers = Number.isFinite(Number(p.max_users)) ? Math.trunc(Number(p.max_users)) : 1
          const featureFlags = typeof p.feature_flags === 'string'
            ? p.feature_flags
            : JSON.stringify(p.feature_flags ?? {})
          const existing = findPlan.get(name) as { id?: number } | undefined
          if (existing?.id) {
            updatePlan.run(
              price, duration, features, active, recommended, now,
              maxDevices, maxTransactions, maxProducts, maxUsers, featureFlags,
              existing.id,
            )
          } else {
            insertPlan.run(
              name, price, duration, features, active, recommended, now, now,
              maxDevices, maxTransactions, maxProducts, maxUsers, featureFlags,
            )
          }
        }
      })
      tx(plans.data ?? [])
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal sync paket dari license server' }
    }

    const popups = await call<any[]>('GET', '/admin/popups')
    if (popups.success && Array.isArray(popups.data)) {
      const upsertPopup = sqlite.prepare(`
        INSERT INTO mediasoft_popup_rules
          (code, title, description, cta_text, cta_url, whatsapp_number, pricing_html, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(code) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          cta_text = excluded.cta_text,
          cta_url = excluded.cta_url,
          whatsapp_number = excluded.whatsapp_number,
          pricing_html = excluded.pricing_html,
          is_active = excluded.is_active,
          updated_at = datetime('now')
      `)
      const tx = sqlite.transaction((rows: any[]) => {
        for (const p of rows) {
          upsertPopup.run(
            p.code,
            p.title,
            p.description ?? null,
            p.cta_text ?? 'Upgrade Sekarang',
            p.cta_url ?? null,
            p.whatsapp_number ?? null,
            p.pricing_html ?? null,
            p.is_active === false || p.is_active === 0 ? 0 : 1,
          )
        }
      })
      tx(popups.data)
    }

    return {
      success: true,
      message: `Sync lisensi selesai: ${(plans.data ?? []).length} paket diproses`,
      data: { plans: (plans.data ?? []).length, popups: Array.isArray(popups.data) ? popups.data.length : 0 },
    }
  }

  static async getUsers(search?: string) { return call('GET', `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`) }
  static async createUser(data: unknown) { return call('POST', '/admin/users', data) }
  static async updateUser(id: string | number, data: unknown) { return call('PATCH', `/admin/users/${id}`, data) }
  static async deleteUser(id: string | number) { return call('DELETE', `/admin/users/${id}`) }
  static async changeUserPlan(id: string | number, data: unknown) { return call('PUT', `/admin/users/${id}/plan`, data) }
  static async resetUserPassword(id: string | number) { return call('POST', `/admin/users/${id}/reset-password`) }

  static async getLicensePlans() { return call('GET', '/admin/plans') }
  static async updateLicensePlan(id: string | number, data: unknown) { return call('PATCH', `/admin/plans/${id}`, data) }
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
}
