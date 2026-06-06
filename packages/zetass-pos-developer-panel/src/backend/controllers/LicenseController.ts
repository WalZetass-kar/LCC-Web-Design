/**
 * LicenseController — forward request ke license server via HTTP.
 * URL dan token admin disimpan di tabel mediasoft_identitas.
 */
import https from 'https'
import http from 'http'
import crypto from 'crypto'
import tls from 'tls'
import { sqlite } from '../../database/connection.js'
import { isLicenseSessionExpiredResult } from '../../shared/licenseSession.js'

const DEFAULT_LICENSE_SERVER_URL = 'https://azhkvmkmimepmflzqqty.supabase.co/functions/v1/mediasoft-license'
const DEFAULT_CERT_PIN_SHA256 = 'p51goejPCgGH+Oog/MU2k6PObcEfTrrr73jUcuWJ7w0='

function getConfig(): { url: string; token: string; refreshToken?: string | null } | null {
  try {
    const row = sqlite
      .prepare(`SELECT license_server_url, license_admin_token, license_admin_refresh_token FROM mediasoft_identitas LIMIT 1`)
      .get() as { license_server_url?: string; license_admin_token?: string; license_admin_refresh_token?: string | null } | undefined
    if (!row?.license_server_url || !row?.license_admin_token) return null
    return { url: row.license_server_url.replace(/\/$/, ''), token: row.license_admin_token, refreshToken: row.license_admin_refresh_token ?? null }
  } catch {
    return null
  }
}

function saveConfig(url: string, token: string, refreshToken?: string | null) {
  const existing = sqlite.prepare(`SELECT kode FROM mediasoft_identitas LIMIT 1`).get() as { kode?: number } | undefined
  if (existing?.kode) {
    sqlite.prepare(`UPDATE mediasoft_identitas SET license_server_url = ?, license_admin_token = ?, license_admin_refresh_token = COALESCE(?, license_admin_refresh_token) WHERE kode = ?`)
      .run(url, token, refreshToken ?? null, existing.kode)
    return
  }
  sqlite.prepare(`INSERT INTO mediasoft_identitas (kode, license_server_url, license_admin_token, license_admin_refresh_token) VALUES (1, ?, ?, ?)`)
    .run(url, token, refreshToken ?? null)
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

function isLocalDevHost(hostname: string) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase())
}

function configuredPinnedHosts() {
  const hosts = new Set<string>()
  for (const value of [
    DEFAULT_LICENSE_SERVER_URL,
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_API_BASE_URL,
    process.env.ZETASS_POS_PINNED_DOMAIN ? `https://${process.env.ZETASS_POS_PINNED_DOMAIN}` : undefined,
  ]) {
    if (!value) continue
    try {
      hosts.add(new URL(value).hostname.toLowerCase())
    } catch {
      // Ignore invalid optional environment values.
    }
  }
  return hosts
}

function checkPinnedServerIdentity(hostname: string, cert: tls.PeerCertificate) {
  const defaultError = tls.checkServerIdentity(hostname, cert)
  if (defaultError) return defaultError

  const pins = configuredPinnedHosts()
  if (!pins.has(hostname.toLowerCase())) return undefined

  const expectedPin = (process.env.ZETASS_POS_CERT_PIN_SHA256 || process.env.VITE_CERT_PIN_SHA256 || DEFAULT_CERT_PIN_SHA256).trim()
  if (!expectedPin) return undefined

  try {
    const x509 = new crypto.X509Certificate(cert.raw)
    const spkiDer = x509.publicKey.export({ type: 'spki', format: 'der' }) as Buffer
    const actualPin = crypto.createHash('sha256').update(spkiDer).digest('base64')
    if (actualPin === expectedPin) return undefined
  } catch {
    return new Error('Gagal memvalidasi certificate pin license server')
  }

  return new Error('Certificate pinning license server gagal')
}

function request<T = unknown>(method: string, path: string, token: string, baseUrl: string, body?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const fullUrl = `${baseUrl}${path}`
    const payload = body ? JSON.stringify(body) : undefined

    let parsed: URL
    try { parsed = new URL(fullUrl) }
    catch { return reject(new Error(`URL tidak valid: ${fullUrl}`)) }

    const isHttps = parsed.protocol === 'https:'
    if (!isHttps && !isLocalDevHost(parsed.hostname)) {
      return reject(new Error('License server production wajib menggunakan HTTPS'))
    }

    const port = parsed.port ? Number(parsed.port) : (isHttps ? 443 : 80)

    const options: https.RequestOptions | http.RequestOptions = {
      hostname: parsed.hostname,
      port,
      path: parsed.pathname + parsed.search,
      method,
      family: isLocalDevHost(parsed.hostname) ? undefined : 4,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
      ...(isHttps ? { checkServerIdentity: checkPinnedServerIdentity } : {}),
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

function isLifetimePlan(plan: any) {
  const text = `${plan?.code ?? ''} ${plan?.name ?? ''}`.toLowerCase()
  return Number(plan?.duration_days ?? 0) === 0 || text.includes('lifetime') || text.includes('seumur')
}

function buyerVisiblePlans<T extends Record<string, any>>(plans: T[]) {
  const activePlans = plans.filter(plan => plan.is_active !== false && plan.is_active !== 0)
  const lifetimePlans = activePlans.filter(isLifetimePlan)
  return (lifetimePlans.length > 0 ? lifetimePlans : activePlans).sort((a, b) => {
    const aRecommended = a.is_recommended === true || a.is_recommended === 1 ? 1 : 0
    const bRecommended = b.is_recommended === true || b.is_recommended === 1 ? 1 : 0
    return bRecommended - aRecommended
  })
}

async function refreshAdminToken(cfg: { url: string; refreshToken?: string | null }): Promise<string | null> {
  if (!cfg.refreshToken) return null
  const refresh = await request<ApiResult<any>>('POST', '/auth/refresh', '', cfg.url, { refresh_token: cfg.refreshToken })
  if (!refresh.success || !refresh.data?.access_token) return null
  const accessToken = String(refresh.data.access_token)
  const refreshToken = refresh.data.refresh_token ? String(refresh.data.refresh_token) : cfg.refreshToken
  saveConfig(cfg.url, accessToken, refreshToken)
  return accessToken
}

function planIdFromRemote(plan: any): number | null {
  if (!plan) return null
  const name = String(plan.name ?? plan.code ?? 'Paket').trim()
  if (!name) return null

  const existing = sqlite
    .prepare(`SELECT id FROM mediasoft_subscription_plans WHERE name = ? LIMIT 1`)
    .get(name) as { id?: number } | undefined

  const now = new Date().toISOString()
  const featureFlags = typeof plan.feature_flags === 'string'
    ? plan.feature_flags
    : JSON.stringify(plan.feature_flags ?? {})
  const values = {
    price: Math.round(Number(plan.price ?? 0)),
    duration: Math.max(0, Math.trunc(Number(plan.duration_days ?? 30))),
    features: JSON.stringify(plan.description ? [String(plan.description)] : []),
    active: plan.is_active === false || plan.is_active === 0 ? 0 : 1,
    recommended: plan.is_recommended === true || plan.is_recommended === 1 ? 1 : 0,
    maxDevices: Number.isFinite(Number(plan.max_devices)) ? Math.trunc(Number(plan.max_devices)) : 1,
    maxTransactions: Number.isFinite(Number(plan.max_transactions_per_day)) ? Math.trunc(Number(plan.max_transactions_per_day)) : -1,
    maxProducts: Number.isFinite(Number(plan.max_products)) ? Math.trunc(Number(plan.max_products)) : -1,
    maxUsers: Number.isFinite(Number(plan.max_users)) ? Math.trunc(Number(plan.max_users)) : 1,
  }

  if (existing?.id) {
    sqlite.prepare(`
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
    `).run(
      values.price,
      values.duration,
      values.features,
      values.active,
      values.recommended,
      now,
      values.maxDevices,
      values.maxTransactions,
      values.maxProducts,
      values.maxUsers,
      featureFlags,
      existing.id,
    )
    return existing.id
  }

  const inserted = sqlite.prepare(`
    INSERT INTO mediasoft_subscription_plans
      (name, price, duration_days, features, is_active, is_recommended, created_at, updated_at,
       max_devices, max_transactions_per_day, max_products, max_users, feature_flags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    values.price,
    values.duration,
    values.features,
    values.active,
    values.recommended,
    now,
    now,
    values.maxDevices,
    values.maxTransactions,
    values.maxProducts,
    values.maxUsers,
    featureFlags,
  )
  return Number(inserted.lastInsertRowid)
}

function syncLocalBuyerFromLicensePayload(username: string, payload: any) {
  const planId = planIdFromRemote(payload?.plan)
  const expiresAt = typeof payload?.subscription?.expires_at === 'string'
    ? payload.subscription.expires_at
    : null

  if (planId || expiresAt) {
    sqlite.prepare(`
      UPDATE mediasoft_pengguna
      SET subscription_plan_id = COALESCE(?, subscription_plan_id),
          subscription_expires_at = COALESCE(?, subscription_expires_at),
          access_expires_at = COALESCE(?, access_expires_at),
          status_user = CASE WHEN ? = 'active' THEN 'Aktif' ELSE status_user END
      WHERE nama_pengguna = ?
    `).run(
      planId,
      expiresAt,
      expiresAt,
      payload?.customer?.status ?? 'active',
      username,
    )
  }
}

function errorCodeFromLicenseResult(result: ApiResult<any>): string | undefined {
  return (result.data as any)?.error_code
    || (result.data as any)?.status
    || (result.message?.toLowerCase().includes('tidak ditemukan') ? 'NOT_FOUND' : undefined)
    || undefined
}

function getPublicLicenseUrl(): string | null {
  const envUrl = (
    process.env.ZETASS_POS_LICENSE_SERVER_URL ||
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
  static saveAdminSessionFromRemote(remote?: any) {
    const accessToken = typeof remote?.access_token === 'string' ? remote.access_token : ''
    if (!accessToken) return

    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return

    const refreshToken = typeof remote?.refresh_token === 'string' ? remote.refresh_token : null
    saveConfig(endpoint, accessToken, refreshToken)
  }

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
      return { success: false, message: e?.message || 'Gagal login ke license server pusat', data: { error_code: 'OFFLINE' } }
    }
  }

  static async loginAdmin(data: {
    email: string
    password: string
  }, deviceInfo?: unknown): Promise<ApiResult<any> | null> {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return null

    const device = (deviceInfo && typeof deviceInfo === 'object') ? deviceInfo as any : {}
    try {
      return await request<ApiResult<any>>('POST', '/auth/login', '', endpoint, {
        email: data.email,
        password: data.password,
        device_id: device.deviceId ?? device.device_id ?? 'pos-app-admin',
        device_name: device.deviceName ?? device.device_name ?? 'Zetass Pos Admin',
        platform: device.platform ?? device.osName ?? device.os_name ?? 'desktop',
        app_version: device.appVersion ?? device.app_version ?? undefined,
      })
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal login admin ke license server pusat', data: { error_code: 'OFFLINE' } }
    }
  }

  static async checkBuyerLicense(email: string, deviceInfo?: unknown): Promise<ApiResult<any> | null> {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return null
    try {
      return await request<ApiResult<any>>('POST', '/check-license', '', endpoint, {
        email,
        device: deviceInfo ?? {},
      })
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal sinkronisasi ke license server pusat', data: { error_code: 'OFFLINE' } }
    }
  }

  static async syncBuyerLicense(username: string, deviceInfo?: unknown): Promise<ApiResult<any>> {
    const user = sqlite
      .prepare(`SELECT nama_pengguna, email, is_buyer FROM mediasoft_pengguna WHERE nama_pengguna = ? LIMIT 1`)
      .get(username) as { nama_pengguna?: string; email?: string | null; is_buyer?: number | null } | undefined

    if (!user?.nama_pengguna || !user.is_buyer || !user.email) {
      return { success: true, data: { skipped: true, reason: 'not_remote_buyer' } }
    }

    const result = await this.checkBuyerLicense(user.email, deviceInfo)
    if (!result) return { success: true, data: { skipped: true, reason: 'no_public_endpoint' } }

    if (result.success) {
      syncLocalBuyerFromLicensePayload(username, result.data)
      return {
        success: true,
        data: {
          ...(result.data as any),
          synced_at: new Date().toISOString(),
        },
      }
    }

    const code = errorCodeFromLicenseResult(result)
    if (String(code).toUpperCase() === 'NOT_FOUND') {
      sqlite.prepare(`DELETE FROM mediasoft_pengguna WHERE nama_pengguna = ? AND is_buyer = 1`).run(username)
    }
    if (['BLOCKED', 'SUSPENDED', 'INACTIVE', 'DEVICE_BLOCKED'].includes(String(code).toUpperCase())) {
      sqlite.prepare(`UPDATE mediasoft_pengguna SET status_user = 'Nonaktif' WHERE nama_pengguna = ?`).run(username)
    }
    if (String(code).toUpperCase() === 'EXPIRED' && result.data) {
      syncLocalBuyerFromLicensePayload(username, result.data)
    }

    return {
      ...result,
      data: {
        ...(result.data as any),
        error_code: code,
      },
    }
  }

  static async createPaymentInvoice(data: { email?: string; customer_id?: string; plan_code: string; notes?: string }) {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return { success: false, message: 'License server publik belum dikonfigurasi' }
    try {
      return await request<ApiResult<any>>('POST', '/payments/create', '', endpoint, data)
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal membuat invoice pembayaran' }
    }
  }

  static async createManualPaymentRequest(data: { email?: string; customer_id?: string; plan_code: string; notes?: string }) {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return { success: false, message: 'License server publik belum dikonfigurasi' }
    try {
      return await request<ApiResult<any>>('POST', '/payments/manual-request', '', endpoint, data)
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal membuat request pembayaran manual' }
    }
  }

  static async getPaymentStatus(externalRef: string) {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return { success: false, message: 'License server publik belum dikonfigurasi' }
    if (!externalRef?.trim()) return { success: false, message: 'Nomor invoice tidak valid' }
    try {
      return await request<ApiResult<any>>('GET', `/payments/status?external_ref=${encodeURIComponent(externalRef)}`, '', endpoint)
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal mengecek status pembayaran' }
    }
  }

  static async getPublicPlans() {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return { success: false, message: 'License server publik belum dikonfigurasi' }
    try {
      const result = await request<ApiResult<any[]>>('GET', '/plans', '', endpoint)
      if (!result.success || !Array.isArray(result.data)) return result
      return { ...result, data: buyerVisiblePlans(result.data) }
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal memuat paket dari license server' }
    }
  }

  static async getPublicPopup(code: string) {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return { success: false, message: 'License server publik belum dikonfigurasi' }
    const popupCode = String(code ?? '').trim()
    if (!popupCode) return { success: false, message: 'Kode popup tidak valid' }
    try {
      return await request<ApiResult<any>>('GET', `/popup/${encodeURIComponent(popupCode)}`, '', endpoint)
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal memuat popup dari license server' }
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
          const duration = Math.max(0, Math.trunc(Number(p.duration_days ?? 30)))
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
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return { success: false, message: 'License server publik belum dikonfigurasi' }
    return request<ApiResult<any>>('POST', '/app-update', '', endpoint, data)
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
  static async heartbeat(data: unknown, token?: string | null) {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return { success: false, message: 'License server publik belum dikonfigurasi' }
    return request<ApiResult<any>>('POST', '/heartbeat', token ?? '', endpoint, data)
  }
  static async logError(data: unknown) {
    const endpoint = getPublicLicenseUrl()
    if (!endpoint) return { success: false, message: 'License server publik belum dikonfigurasi' }
    return request<ApiResult<any>>('POST', '/errors', '', endpoint, data)
  }
}
