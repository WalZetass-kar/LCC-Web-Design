// Zetass Pos central license API for Supabase Edge Functions.
// Deploy with: supabase functions deploy mediasoft-license

declare const Deno: any

type JsonMap = Record<string, unknown>

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SECRET_KEY') ??
  ''
const ANON_KEY =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
  SERVICE_ROLE_KEY
const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY') ?? ''
const MIDTRANS_IS_PRODUCTION = ['1', 'true', 'yes', 'on'].includes(
  (Deno.env.get('MIDTRANS_IS_PRODUCTION') ?? 'false').toLowerCase(),
)
const APP_PUBLIC_URL = Deno.env.get('APP_PUBLIC_URL') ?? ''
const DEVELOPER_WHATSAPP =
  Deno.env.get('DEVELOPER_WHATSAPP') ??
  Deno.env.get('APP_WHATSAPP_NUMBER') ??
  Deno.env.get('APP_WHATSAPP') ??
  ''

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function ok(data?: unknown, message = 'OK') {
  return json({ success: true, data, message })
}

function fail(message: string, status = 400, data?: unknown) {
  return json({ success: false, message, data }, status)
}

function requireEnv() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib tersedia di secrets Edge Function')
  }
}

function restUrl(path: string) {
  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`
}

async function rest<T = unknown>(method: string, path: string, body?: unknown, prefer?: string): Promise<T> {
  requireEnv()
  const response = await fetch(restUrl(path), {
    method,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Database error ${response.status}: ${text}`)
  }

  if (response.status === 204) return null as T
  const text = await response.text()
  if (!text.trim()) return null as T
  return JSON.parse(text) as T
}

async function authRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  apiKey = ANON_KEY,
  bearerToken = apiKey,
): Promise<T> {
  requireEnv()
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1${path}`, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload?.msg ?? payload?.message ?? payload?.error_description ?? `Auth error ${response.status}`
    throw new Error(message)
  }
  return payload as T
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
  return fallback
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toPositiveInt(value: unknown, fallback: number) {
  const n = Math.trunc(toNumber(value, fallback))
  return n > 0 ? n : fallback
}

function toPlanDurationDays(value: unknown, fallback: number) {
  const n = Math.trunc(toNumber(value, fallback))
  return n >= 0 ? n : fallback
}

function isLifetimePlan(plan: any, durationDays = Number(plan?.duration_days ?? 0)) {
  const code = normalizePlanCode(plan?.code)
  const name = cleanText(plan?.name).toLowerCase()
  return durationDays <= 0 || code.includes('LIFETIME') || code.includes('SEUMUR') || name.includes('seumur') || name.includes('lifetime')
}

function nowIso() {
  return new Date().toISOString()
}

function isFuture(value: unknown) {
  const text = cleanText(value)
  if (!text) return false
  const ts = new Date(text).getTime()
  return Number.isFinite(ts) && ts > Date.now()
}

function statusErrorCode(status: string) {
  if (status === 'blocked') return 'BLOCKED'
  if (status === 'suspended') return 'SUSPENDED'
  if (status === 'inactive') return 'INACTIVE'
  return 'ACCOUNT_INACTIVE'
}

function mapPaymentStatus(status: string, fraudStatus?: string) {
  if (status === 'settlement') return 'paid'
  if (status === 'capture') return fraudStatus && fraudStatus !== 'accept' ? 'failed' : 'paid'
  if (status === 'pending') return 'pending'
  if (status === 'expire') return 'expired'
  if (['deny', 'cancel', 'failure'].includes(status)) return 'failed'
  return 'pending'
}

function isPaymentPaid(status: string) {
  return status === 'paid' || status === 'success'
}

function midtransBaseUrl() {
  return MIDTRANS_IS_PRODUCTION
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
}

function midtransAuthHeader() {
  return `Basic ${btoa(`${MIDTRANS_SERVER_KEY}:`)}`
}

async function sha512Hex(input: string) {
  const bytes = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-512', bytes)
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function verifyMidtransSignature(payload: any) {
  if (!MIDTRANS_SERVER_KEY) return false
  const raw = `${payload.order_id ?? ''}${payload.status_code ?? ''}${payload.gross_amount ?? ''}${MIDTRANS_SERVER_KEY}`
  const expected = await sha512Hex(raw)
  return expected === payload.signature_key
}

function invoiceNumber() {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  const suffix = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  return `MS-${Date.now()}-${suffix}`
}

function normalizeWhatsapp(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '')
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  return digits
}

function buildManualPaymentMessage(input: { orderId: string; customer: any; plan: any; amount: number }) {
  return [
    'Halo Developer, saya ingin memperpanjang langganan Zetass Pos.',
    '',
    `Invoice: ${input.orderId}`,
    `Nama: ${input.customer.name ?? '-'}`,
    `Email: ${input.customer.email ?? '-'}`,
    `Paket: ${input.plan.name ?? input.plan.code}`,
    `Kode Paket: ${input.plan.code}`,
    `Nominal: Rp ${Math.round(input.amount).toLocaleString('id-ID')}`,
    '',
    'Mohon info pembayaran dan aktivasi langganannya.',
  ].join('\n')
}

function buildWhatsappUrl(phone: string, message: string) {
  const normalized = normalizeWhatsapp(phone)
  if (!normalized || normalized.length < 10) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

function nullableText(value: unknown) {
  const text = cleanText(value)
  return text || null
}

function randomPassword(length = 14) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%+='
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, byte => chars[byte % chars.length]).join('')
}

function normalizePlanCode(value: unknown) {
  return cleanText(value).toUpperCase()
}

function planAliases(code: string) {
  const aliases: Record<string, string[]> = {
    BASIC: ['BASIC_MONTHLY'],
    PRO: ['PRO_MONTHLY'],
    ANNUAL: ['PRO_ANNUAL', 'TAHUNAN'],
    TAHUNAN: ['PRO_ANNUAL'],
    LIFETIME: ['LIFETIME', 'SEUMUR_HIDUP'],
    SEUMUR_HIDUP: ['LIFETIME'],
    TRIAL: ['TRIAL_3_DAYS'],
    DEMO: ['TRIAL_3_DAYS'],
  }
  return [code, ...(aliases[code] ?? [])]
}

const DEFAULT_FEATURE_CATALOG = [
  { code: 'reports', name: 'Laporan', category: 'report', description: 'Laporan penjualan, laba rugi, stok, dan kas.', sort_order: 10 },
  { code: 'export_excel', name: 'Export Excel', category: 'report', description: 'Export laporan dan data operasional ke Excel.', sort_order: 20 },
  { code: 'export_pdf', name: 'Export PDF', category: 'report', description: 'Export laporan dan bukti transaksi ke PDF.', sort_order: 30 },
  { code: 'multi_user', name: 'Multi User', category: 'access', description: 'Akses lebih dari satu akun operator/kasir.', sort_order: 40 },
  { code: 'backup', name: 'Backup', category: 'data', description: 'Backup data aplikasi.', sort_order: 50 },
  { code: 'restore', name: 'Restore', category: 'data', description: 'Restore/import data backup.', sort_order: 60 },
  { code: 'stock_opname', name: 'Stock Opname', category: 'inventory', description: 'Penyesuaian stok melalui opname.', sort_order: 70 },
  { code: 'debt_management', name: 'Hutang/Piutang', category: 'finance', description: 'Kelola hutang, piutang, dan cicilan.', sort_order: 80 },
  { code: 'shift_management', name: 'Shift Management', category: 'operations', description: 'Kelola shift kasir dan operasional.', sort_order: 90 },
  { code: 'api_access', name: 'E-commerce API', category: 'integration', description: 'Integrasi API e-commerce dan layanan eksternal.', sort_order: 100 },
  { code: 'multi_branch', name: 'Multi Cabang', category: 'operations', description: 'Operasional lebih dari satu cabang.', sort_order: 110 },
  { code: 'return_refund', name: 'Retur/Refund', category: 'sales', description: 'Retur barang dan refund transaksi.', sort_order: 120 },
]

function falseFeatureFlags() {
  return Object.fromEntries(DEFAULT_FEATURE_CATALOG.map(feature => [feature.code, false])) as Record<string, boolean>
}

function trueFeatureFlags() {
  return Object.fromEntries(DEFAULT_FEATURE_CATALOG.map(feature => [feature.code, true])) as Record<string, boolean>
}

const TRIAL_FEATURE_FLAGS = falseFeatureFlags()
const BASIC_FEATURE_FLAGS = {
  ...TRIAL_FEATURE_FLAGS,
  reports: true,
  backup: true,
  return_refund: true,
}
const PRO_FEATURE_FLAGS = {
  ...BASIC_FEATURE_FLAGS,
  export_excel: true,
  export_pdf: true,
  multi_user: true,
  restore: true,
  stock_opname: true,
  debt_management: true,
  shift_management: true,
  api_access: true,
}
const ENTERPRISE_FEATURE_FLAGS = trueFeatureFlags()

const DEFAULT_TRIAL_PLAN = {
  code: 'TRIAL_3_DAYS',
  name: 'Trial 3 Hari',
  description: 'Trial terbatas 3 hari untuk akun pembeli baru.',
  price: 0,
  currency: 'IDR',
  duration_days: 3,
  is_active: true,
  is_recommended: false,
  max_devices: 1,
  max_transactions_per_day: 20,
  max_products: 30,
  max_users: 1,
  feature_flags: TRIAL_FEATURE_FLAGS,
  sort_order: 0,
}

const DEFAULT_ANNUAL_PLAN = {
  code: 'PRO_ANNUAL',
  name: 'Tahunan',
  description: 'Paket 1 tahun untuk operasional lengkap: laporan, export Excel/PDF, multi-user, backup/restore, stock opname, hutang/piutang, shift, API, multi cabang, dan retur/refund.',
  price: 1999000,
  currency: 'IDR',
  duration_days: 365,
  is_active: true,
  is_recommended: false,
  max_devices: 5,
  max_transactions_per_day: -1,
  max_products: -1,
  max_users: 10,
  feature_flags: ENTERPRISE_FEATURE_FLAGS,
  sort_order: 30,
}

const DEFAULT_LIFETIME_PLAN = {
  code: 'LIFETIME',
  name: 'Sekali Beli Seumur Hidup',
  description: 'Paket sekali bayar untuk akses permanen: semua fitur operasional, multi-user, backup/restore, stock opname, hutang/piutang, shift, API, multi cabang, dan retur/refund.',
  price: 4999000,
  currency: 'IDR',
  duration_days: 0,
  is_active: true,
  is_recommended: true,
  max_devices: 5,
  max_transactions_per_day: -1,
  max_products: -1,
  max_users: 10,
  feature_flags: ENTERPRISE_FEATURE_FLAGS,
  sort_order: 40,
}

let defaultFeatureCatalogEnsured = false

function parseFeatureFlags(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([code, enabled]) => [code, toBoolean(enabled)])
  ) as Record<string, boolean>
}

function defaultFeatureFlagsForPlan(plan: any): Record<string, boolean> | null {
  const code = normalizePlanCode(plan?.code)
  const name = cleanText(plan?.name).toLowerCase()

  if (code.includes('TRIAL') || code.includes('DEMO') || name.includes('trial') || name === 'harian') return TRIAL_FEATURE_FLAGS
  if (isLifetimePlan(plan)) return ENTERPRISE_FEATURE_FLAGS
  if (code.includes('ENTERPRISE') || code.includes('TAHUNAN') || code.includes('ANNUAL') || name.includes('enterprise') || name.includes('tahunan')) return ENTERPRISE_FEATURE_FLAGS
  if (code.includes('PRO') || name.includes('pro')) return PRO_FEATURE_FLAGS
  if (code.includes('BASIC') || name.includes('basic') || name === 'bulanan') return BASIC_FEATURE_FLAGS

  return null
}

function sameFeatureFlags(a: Record<string, boolean>, b: Record<string, boolean>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if (a[key] !== b[key]) return false
  }
  return true
}

async function ensureDefaultFeatureCatalog() {
  if (defaultFeatureCatalogEnsured) return
  await rest('POST',
    'feature_catalog?on_conflict=code',
    DEFAULT_FEATURE_CATALOG.map(feature => ({ ...feature, is_active: true })),
    'resolution=merge-duplicates,return=minimal')
  defaultFeatureCatalogEnsured = true
}

async function ensureDefaultTrialPlan() {
  const rows = await rest<any[]>('GET', 'subscription_plans?code=eq.TRIAL_3_DAYS&select=id&limit=1')
  if (rows[0]) return
  await rest('POST',
    'subscription_plans?on_conflict=code',
    DEFAULT_TRIAL_PLAN,
    'resolution=merge-duplicates,return=minimal')
}

async function ensureDefaultAnnualPlan() {
  const rows = await rest<any[]>('GET', 'subscription_plans?code=eq.PRO_ANNUAL&select=id&limit=1')
  if (rows[0]) return
  await rest('POST',
    'subscription_plans?on_conflict=code',
    DEFAULT_ANNUAL_PLAN,
    'resolution=merge-duplicates,return=minimal')
}

async function ensureDefaultLifetimePlan() {
  const rows = await rest<any[]>('GET', 'subscription_plans?code=eq.LIFETIME&select=id&limit=1')
  if (rows[0]) return
  await rest('POST',
    'subscription_plans?on_conflict=code',
    DEFAULT_LIFETIME_PLAN,
    'resolution=merge-duplicates,return=minimal')
}

async function applyDefaultFeatureFlags(plans: any[]) {
  const nextPlans: any[] = []
  for (const plan of plans) {
    const defaults = defaultFeatureFlagsForPlan(plan)
    if (!defaults) {
      nextPlans.push({ ...plan, feature_flags: parseFeatureFlags(plan.feature_flags) })
      continue
    }

    const current = parseFeatureFlags(plan.feature_flags)
    const merged = { ...defaults, ...current }
    if (!sameFeatureFlags(current, merged)) {
      await rest('PATCH',
        `subscription_plans?id=eq.${encodeURIComponent(plan.id)}`,
        { feature_flags: merged, updated_at: nowIso() },
        'return=minimal')
    }
    nextPlans.push({ ...plan, feature_flags: merged })
  }
  return nextPlans
}

async function logActivity(input: {
  customer_id?: string | null
  actor_user_id?: string | null
  event_type: string
  action: string
  metadata?: JsonMap
  req?: Request
}) {
  try {
    await rest('POST', 'license_activity_logs', {
      customer_id: input.customer_id ?? null,
      actor_user_id: input.actor_user_id ?? null,
      event_type: input.event_type,
      action: input.action,
      metadata: input.metadata ?? {},
      ip_address: input.req?.headers.get('x-forwarded-for') ?? null,
      user_agent: input.req?.headers.get('user-agent') ?? null,
    })
  } catch (error) {
    console.warn('activity log skipped', error)
  }
}

async function getAdminFromRequest(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new Error('Token admin tidak ditemukan')

  const authUser = await authRequest<any>('GET', '/user', undefined, ANON_KEY, token)
  const admins = await rest<any[]>('GET',
    `license_admins?user_id=eq.${encodeURIComponent(authUser.id)}&is_active=eq.true&select=user_id,role`
  )
  const admin = admins[0]
  if (!admin) throw new Error('Akun ini bukan admin license server')

  return {
    id: authUser.id as string,
    email: authUser.email as string,
    role: admin.role as string,
  }
}

function mapAdminProfileRole(role: string) {
  return role === 'admin' ? 'admin' : 'developer'
}

function deviceFromBody(body: any): JsonMap {
  return (body?.device ?? body?.deviceInfo ?? body ?? {}) as JsonMap
}

async function upsertAdminDevice(authUser: any, adminRole: string, body: any) {
  const email = String(authUser.email ?? '').toLowerCase()
  if (!email) return null

  const profilePayload = {
    auth_user_id: authUser.id,
    email,
    name: authUser.user_metadata?.name ?? authUser.email ?? email,
    role: mapAdminProfileRole(adminRole),
    status: 'active',
    updated_at: nowIso(),
  }

  const profiles = await rest<any[]>('POST',
    'profiles?on_conflict=auth_user_id&select=*',
    profilePayload,
    'resolution=merge-duplicates,return=representation')
  const profile = profiles[0]
  const device = deviceFromBody(body)
  const deviceId = cleanText(device.device_id ?? device.deviceId)
  if (!profile?.id || !deviceId) return null

  const platform = cleanText(device.platform) || cleanText(device.os_name ?? device.osName) || 'unknown'
  const operatingSystem = cleanText(device.os_name ?? device.osName) || platform
  const rows = await rest<any[]>('POST',
    'app_devices?on_conflict=profile_id,device_id&select=*',
    {
      profile_id: profile.id,
      user_id: authUser.id,
      customer_id: null,
      device_id: deviceId,
      device_name: cleanText(device.device_name ?? device.deviceName) || null,
      platform,
      operating_system: operatingSystem,
      app_version: cleanText(device.app_version ?? device.appVersion) || null,
      license_status: 'active',
      status: 'active',
      last_seen: nowIso(),
      metadata: { admin_role: adminRole, ip_address: cleanText(device.ip_address ?? device.ipAddress) || null },
      updated_at: nowIso(),
    },
    'resolution=merge-duplicates,return=representation')

  return rows[0] ?? null
}

async function handleAdminRefresh(req: Request) {
  const body = await req.json().catch(() => ({}))
  const refreshToken = cleanText(body.refresh_token)
  if (!refreshToken) return fail('Refresh token wajib diisi', 401, { error_code: 'SESSION_EXPIRED' })

  const auth = await authRequest<any>('POST', '/token?grant_type=refresh_token', { refresh_token: refreshToken }, ANON_KEY)
  const admins = await rest<any[]>('GET',
    `license_admins?user_id=eq.${encodeURIComponent(auth.user.id)}&is_active=eq.true&select=user_id,role`
  )
  const admin = admins[0]
  if (!admin) return fail('Akun ini bukan admin di license server', 403)

  await logActivity({
    req,
    actor_user_id: auth.user.id,
    event_type: 'login',
    action: 'ADMIN_TOKEN_REFRESHED',
    metadata: { email: auth.user.email },
  })

  return ok({
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    user: {
      id: auth.user.id,
      name: auth.user.user_metadata?.name ?? auth.user.email,
      email: auth.user.email,
      role: admin.role,
    },
  }, 'Session developer diperbarui')
}

async function getTrialPlan() {
  await ensureDefaultFeatureCatalog()
  await ensureDefaultTrialPlan()
  const plans = await rest<any[]>('GET',
    'subscription_plans?code=eq.TRIAL_3_DAYS&select=*&limit=1'
  )
  const plan = plans[0]
  if (!plan) throw new Error('Paket Trial 3 Hari belum tersedia. Jalankan migration Supabase.')
  return plan
}

async function listPlansRaw() {
  await ensureDefaultFeatureCatalog()
  await ensureDefaultTrialPlan()
  await ensureDefaultAnnualPlan()
  await ensureDefaultLifetimePlan()
  const plans = await rest<any[]>('GET', 'subscription_plans?select=*&order=sort_order.asc')
  return await applyDefaultFeatureFlags(plans)
}

async function getPlanByCode(codeInput: unknown) {
  const code = normalizePlanCode(codeInput)
  const codes = planAliases(code)
  const plans = await listPlansRaw()
  return plans.find(plan => codes.includes(String(plan.code).toUpperCase())) ?? null
}

async function getPlanById(id: string) {
  const rows = await rest<any[]>('GET',
    `subscription_plans?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  )
  return rows[0] ?? null
}

async function getCustomerByEmail(email: string) {
  const rows = await rest<any[]>('GET',
    `license_customers?email=eq.${encodeURIComponent(email)}&select=*&limit=1`
  )
  return rows[0] ?? null
}

async function getCustomer(identifier: { customer_id?: string; email?: string; auth_user_id?: string }) {
  if (identifier.customer_id) {
    const rows = await rest<any[]>('GET',
      `license_customers?id=eq.${encodeURIComponent(identifier.customer_id)}&select=*&limit=1`
    )
    return rows[0] ?? null
  }
  if (identifier.auth_user_id) {
    const rows = await rest<any[]>('GET',
      `license_customers?auth_user_id=eq.${encodeURIComponent(identifier.auth_user_id)}&select=*&limit=1`
    )
    return rows[0] ?? null
  }
  if (identifier.email) return getCustomerByEmail(identifier.email)
  return null
}

async function getActiveSubscription(customerId: string) {
  const now = nowIso()
  const activeRows = await rest<any[]>('GET',
    `customer_subscriptions?customer_id=eq.${encodeURIComponent(customerId)}&status=eq.active&select=*,subscription_plans(*)&order=expires_at.desc.nullsfirst&limit=10`
  )
  const lifetime = activeRows.find(row => !row.expires_at)
  if (lifetime) return lifetime
  const active = activeRows.find(row => row.expires_at && new Date(row.expires_at).getTime() >= new Date(now).getTime())
  if (active) return active

  const latest = await rest<any[]>('GET',
    `customer_subscriptions?customer_id=eq.${encodeURIComponent(customerId)}&select=*,subscription_plans(*)&order=created_at.desc&limit=1`
  )
  if (latest[0]?.status === 'active' && latest[0]?.expires_at && new Date(latest[0].expires_at).getTime() < Date.now()) {
    await rest('PATCH',
      `customer_subscriptions?id=eq.${encodeURIComponent(latest[0].id)}`,
      { status: 'expired' },
      'return=minimal')
    latest[0].status = 'expired'
  }
  return latest[0] ?? null
}

async function getLatestSubscription(customerId: string) {
  const rows = await rest<any[]>('GET',
    `customer_subscriptions?customer_id=eq.${encodeURIComponent(customerId)}&select=*,subscription_plans(*)&order=created_at.desc&limit=1`
  )
  return rows[0] ?? null
}

async function getCustomerById(id: string) {
  const rows = await rest<any[]>('GET',
    `license_customers?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  )
  return rows[0] ?? null
}

async function getPopup(code: string) {
  const rows = await rest<any[]>('GET',
    `popup_rules?code=eq.${encodeURIComponent(code)}&is_active=eq.true&select=*&limit=1`
  )
  return rows[0] ?? null
}

function subscriptionDaysRemaining(subscription: any): number | null {
  const expiresAt = subscription?.expires_at
  if (!expiresAt) return null
  const expires = new Date(expiresAt).getTime()
  if (!Number.isFinite(expires)) return null
  return Math.max(0, Math.ceil((expires - Date.now()) / 86400000))
}

function shouldApplyForcedPopup(popup: any, subscription?: any) {
  const code = String(popup?.code ?? '').toUpperCase()
  if (code !== 'ACCESS_EXPIRING') return true

  const daysRemaining = subscriptionDaysRemaining(subscription)
  if (daysRemaining === null) return false

  const durationDays = Number(subscription?.subscription_plans?.duration_days ?? 0)
  const thresholdDays = Number.isFinite(durationDays) && durationDays > 7 ? 7 : 1
  return daysRemaining <= thresholdDays
}

async function getForcedPopup(customer?: any, subscription?: any) {
  const customerPopupCode = cleanText(customer?.force_popup_code)
  if (customerPopupCode && (!customer.force_popup_until || isFuture(customer.force_popup_until))) {
    const popup = await getPopup(customerPopupCode)
    if (popup && shouldApplyForcedPopup(popup, subscription)) return popup
  }

  const rows = await rest<any[]>('GET',
    `popup_rules?force_popup=eq.true&is_active=eq.true&select=*&order=updated_at.desc&limit=1`
  )
  const popup = rows.find(row => (
    (!row.force_popup_until || isFuture(row.force_popup_until))
    && shouldApplyForcedPopup(row, subscription)
  ))
  return popup ?? null
}

async function validateDevice(customerId: string, plan: any, device: JsonMap) {
  const deviceId = cleanText(device.device_id ?? device.deviceId)
  if (!deviceId) return { allowed: true, reason: null, current: 0, max: Number(plan.max_devices ?? 1), device: null }

  const existingRows = await rest<any[]>('GET',
    `customer_devices?customer_id=eq.${encodeURIComponent(customerId)}&device_id=eq.${encodeURIComponent(deviceId)}&select=*&limit=1`
  )
  const existing = existingRows[0]
  const activeRows = await rest<any[]>('GET',
    `customer_devices?customer_id=eq.${encodeURIComponent(customerId)}&status=eq.active&select=id`
  )
  const current = activeRows.length
  const max = Number(plan.max_devices ?? 1)

  if (existing?.status === 'revoked' || existing?.status === 'blocked' || existing?.status === 'inactive') {
    return { allowed: false, reason: existing.status === 'inactive' ? 'device_inactive' : 'device_blocked', current, max, device: existing }
  }

  if (!existing && max !== -1 && current >= max) {
    return { allowed: false, reason: 'device_limit', current, max, device: null }
  }

  const row = {
    customer_id: customerId,
    device_id: deviceId,
    device_name: cleanText(device.device_name ?? device.deviceName) || null,
    platform: cleanText(device.platform) || null,
    os_name: cleanText(device.os_name ?? device.osName) || null,
    app_version: cleanText(device.app_version ?? device.appVersion) || null,
    ip_address: cleanText(device.ip_address ?? device.ipAddress) || null,
    last_seen_at: new Date().toISOString(),
    status: existing?.status ?? 'active',
  }

  const saved = existing
    ? await rest<any[]>('PATCH',
        `customer_devices?id=eq.${encodeURIComponent(existing.id)}&select=*`,
        row,
        'return=representation')
    : await rest<any[]>('POST',
        'customer_devices?select=*',
        row,
        'return=representation')

  return { allowed: true, reason: null, current: existing ? current : current + 1, max, device: saved[0] }
}

function subscriptionPayload(customer: any, subscription: any, deviceCheck?: any) {
  const plan = subscription?.subscription_plans
  const expiresAt = subscription?.expires_at ?? null
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000))
    : null

  return {
    customer: customer ? {
      id: customer.id,
      auth_user_id: customer.auth_user_id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      force_popup_code: customer.force_popup_code ?? null,
      force_popup_until: customer.force_popup_until ?? null,
    } : null,
    subscription: subscription ? {
      id: subscription.id,
      status: subscription.status,
      started_at: subscription.started_at,
      expires_at: expiresAt,
      days_remaining: daysRemaining,
    } : null,
    plan: plan ? {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      price: Number(plan.price ?? 0),
      duration_days: Number(plan.duration_days ?? 0),
      max_devices: Number(plan.max_devices ?? 1),
      max_transactions_per_day: Number(plan.max_transactions_per_day ?? -1),
      max_products: Number(plan.max_products ?? -1),
      max_users: Number(plan.max_users ?? 1),
      feature_flags: plan.feature_flags ?? {},
    } : null,
    is_expired: !subscription || subscription.status !== 'active' || (expiresAt ? new Date(expiresAt).getTime() < Date.now() : false),
    device: deviceCheck ?? null,
    server_time: nowIso(),
  }
}

async function handleRegisterTrial(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = cleanText(body.email).toLowerCase()
  const password = cleanText(body.password)
  const name = cleanText(body.name ?? body.nama_lengkap)
  const phone = cleanText(body.phone ?? body.no_telp)
  const device = (body.device ?? body.deviceInfo ?? {}) as JsonMap

  if (!isValidEmail(email)) return fail('Email tidak valid')
  if (password.length < 8) return fail('Password minimal 8 karakter')
  if (!name) return fail('Nama lengkap wajib diisi')

  const existing = await getCustomerByEmail(email)
  if (existing) return fail('Email sudah terdaftar. Silakan login atau upgrade akun yang sudah ada.', 409)

  const trialPlan = await getTrialPlan()
  const authUser = await authRequest<any>('POST', '/admin/users', {
    email,
    password,
    email_confirm: true,
    user_metadata: { name, phone },
  }, SERVICE_ROLE_KEY)

  const customers = await rest<any[]>('POST', 'license_customers?select=*', {
    auth_user_id: authUser.id,
    name,
    email,
    phone: phone || null,
    status: 'active',
  }, 'return=representation')
  const customer = customers[0]

  const expiresAt = new Date(Date.now() + Number(trialPlan.duration_days ?? 3) * 86400000).toISOString()
  const subscriptions = await rest<any[]>('POST', 'customer_subscriptions?select=*,subscription_plans(*)', {
    customer_id: customer.id,
    plan_id: trialPlan.id,
    status: 'active',
    started_at: new Date().toISOString(),
    expires_at: expiresAt,
    source: 'trial',
  }, 'return=representation')
  const subscription = subscriptions[0]
  const deviceCheck = await validateDevice(customer.id, trialPlan, device)
  const authSession = await authRequest<any>('POST', '/token?grant_type=password', { email, password }, ANON_KEY)

  await logActivity({
    req,
    customer_id: customer.id,
    event_type: 'subscription',
    action: 'TRIAL_REGISTERED',
    metadata: { email, plan_code: trialPlan.code, expires_at: expiresAt, device_id: device.device_id ?? device.deviceId ?? null },
  })

  return ok({
    ...subscriptionPayload(customer, subscription, deviceCheck),
    access_token: authSession.access_token,
    refresh_token: authSession.refresh_token,
  }, 'Trial 3 hari aktif')
}

async function handleCheckLicense(req: Request) {
  const body = await req.json().catch(() => ({}))
  const customer = await getCustomer({
    customer_id: cleanText(body.customer_id),
    email: cleanText(body.email).toLowerCase(),
    auth_user_id: cleanText(body.auth_user_id),
  })
  if (!customer) return fail('Akun pembeli tidak ditemukan', 404)
  if (customer.status !== 'active') {
    const popup = await getPopup(customer.status === 'blocked' ? 'BLOCKED' : 'EXPIRED')
    return fail('Akun pembeli tidak aktif', 403, {
      status: customer.status,
      error_code: statusErrorCode(customer.status),
      popup,
    })
  }

  const subscription = await getActiveSubscription(customer.id)
  if (!subscription || !subscription.subscription_plans) {
    return fail('Langganan tidak aktif atau sudah berakhir', 402, {
      ...subscriptionPayload(customer, subscription),
      popup: await getPopup('EXPIRED'),
    })
  }

  if (subscription.status !== 'active' || (subscription.expires_at && new Date(subscription.expires_at).getTime() < Date.now())) {
    const code = subscription.status === 'blocked' || subscription.status === 'suspended' ? 'BLOCKED' : 'EXPIRED'
    return fail(
      code === 'EXPIRED' ? 'Langganan sudah berakhir' : 'Langganan diblokir atau ditangguhkan',
      code === 'EXPIRED' ? 402 : 403,
      {
        ...subscriptionPayload(customer, subscription),
        error_code: code,
        popup: await getPopup(code),
      },
    )
  }

  const deviceCheck = await validateDevice(customer.id, subscription.subscription_plans, body.device ?? body.deviceInfo ?? body)
  if (!deviceCheck.allowed) {
    return fail(
      deviceCheck.reason === 'device_limit' ? 'Batas device paket sudah tercapai' : 'Device sudah direvoke atau diblokir',
      403,
      {
        ...subscriptionPayload(customer, subscription, deviceCheck),
        error_code: deviceCheck.reason === 'device_limit' ? 'DEVICE_LIMIT' : 'DEVICE_BLOCKED',
        popup: await getPopup(deviceCheck.reason === 'device_limit' ? 'DEVICE_LIMIT' : 'BLOCKED'),
      },
    )
  }

  await logActivity({
    req,
    customer_id: customer.id,
    event_type: 'license',
    action: 'LICENSE_CHECKED',
    metadata: { device_id: body.device_id ?? body.device?.device_id ?? null },
  })

  const forcedPopup = await getForcedPopup(customer, subscription)
  return ok({
    ...subscriptionPayload(customer, subscription, deviceCheck),
    popup: forcedPopup,
    force_popup: !!forcedPopup,
  }, 'Lisensi aktif')
}

async function handleActiveFeatures(req: Request) {
  const url = new URL(req.url)
  const customer = await getCustomer({
    customer_id: cleanText(url.searchParams.get('customer_id')),
    email: cleanText(url.searchParams.get('email')).toLowerCase(),
  })
  if (!customer) return fail('Akun pembeli tidak ditemukan', 404)

  const subscription = await getActiveSubscription(customer.id)
  const flags = subscription?.subscription_plans?.feature_flags ?? {}
  const features = Object.entries(flags).map(([code, enabled]) => ({ code, enabled: enabled !== false }))
  return ok(features)
}

async function handleAdminLogin(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = cleanText(body.email).toLowerCase()
  const password = cleanText(body.password)
  if (!email || !password) return fail('Email dan password wajib diisi')

  const auth = await authRequest<any>('POST', '/token?grant_type=password', { email, password }, ANON_KEY)
  const admins = await rest<any[]>('GET',
    `license_admins?user_id=eq.${encodeURIComponent(auth.user.id)}&is_active=eq.true&select=user_id,role`
  )
  const admin = admins[0]
  if (!admin) return fail('Akun ini bukan admin di license server', 403)
  const device = await upsertAdminDevice(auth.user, admin.role, body)

  await logActivity({
    req,
    actor_user_id: auth.user.id,
    event_type: 'login',
    action: 'ADMIN_LOGIN',
    metadata: { email, device_id: device?.device_id ?? body.device_id ?? body.device?.device_id ?? null },
  })

  return ok({
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    device,
    user: {
      id: auth.user.id,
      name: auth.user.user_metadata?.name ?? auth.user.email,
      email: auth.user.email,
      role: admin.role,
    },
  }, 'Login berhasil')
}

async function handleCustomerLogin(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = cleanText(body.email ?? body.username).toLowerCase()
  const password = cleanText(body.password)
  if (!isValidEmail(email)) return fail('Email tidak valid')
  if (!password) return fail('Password wajib diisi')

  const auth = await authRequest<any>('POST', '/token?grant_type=password', { email, password }, ANON_KEY)
  const customer = await getCustomer({ auth_user_id: auth.user.id, email })
  if (!customer) return fail('Akun pembeli tidak ditemukan', 404)
  if (customer.status !== 'active') {
    const popup = await getPopup(customer.status === 'blocked' ? 'BLOCKED' : 'EXPIRED')
    return fail('Akun pembeli tidak aktif', 403, {
      status: customer.status,
      error_code: statusErrorCode(customer.status),
      popup,
    })
  }

  const subscription = await getActiveSubscription(customer.id)
  if (!subscription || !subscription.subscription_plans) {
    return fail('Langganan tidak aktif atau sudah berakhir', 402, {
      ...subscriptionPayload(customer, subscription),
      popup: await getPopup('EXPIRED'),
    })
  }

  if (subscription.status !== 'active' || (subscription.expires_at && new Date(subscription.expires_at).getTime() < Date.now())) {
    const code = subscription.status === 'blocked' || subscription.status === 'suspended' ? 'BLOCKED' : 'EXPIRED'
    return fail(
      code === 'EXPIRED' ? 'Langganan sudah berakhir' : 'Langganan diblokir atau ditangguhkan',
      code === 'EXPIRED' ? 402 : 403,
      {
        ...subscriptionPayload(customer, subscription),
        error_code: code,
        popup: await getPopup(code),
      },
    )
  }

  const deviceCheck = await validateDevice(customer.id, subscription.subscription_plans, body.device ?? body.deviceInfo ?? body)
  if (!deviceCheck.allowed) {
    return fail(
      deviceCheck.reason === 'device_limit' ? 'Batas device paket sudah tercapai' : 'Device sudah direvoke atau diblokir',
      403,
      {
        ...subscriptionPayload(customer, subscription, deviceCheck),
        error_code: deviceCheck.reason === 'device_limit' ? 'DEVICE_LIMIT' : 'DEVICE_BLOCKED',
        popup: await getPopup(deviceCheck.reason === 'device_limit' ? 'DEVICE_LIMIT' : 'BLOCKED'),
      },
    )
  }

  await logActivity({
    req,
    customer_id: customer.id,
    event_type: 'login',
    action: 'CUSTOMER_LOGIN',
    metadata: { email, device_id: body.device_id ?? body.device?.device_id ?? null },
  })

  return ok({
    ...subscriptionPayload(customer, subscription, deviceCheck),
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    popup: await getForcedPopup(customer, subscription),
  }, 'Login pembeli berhasil')
}

function serializePlan(plan: any) {
  return {
    ...plan,
    price: Number(plan.price ?? 0),
    duration_days: Number(plan.duration_days ?? 0),
    is_active: toBoolean(plan.is_active),
    is_recommended: toBoolean(plan.is_recommended),
    max_devices: Number(plan.max_devices ?? 1),
    max_transactions_per_day: Number(plan.max_transactions_per_day ?? -1),
    max_products: Number(plan.max_products ?? -1),
    max_users: Number(plan.max_users ?? 1),
    feature_flags: plan.feature_flags ?? {},
  }
}

function buyerVisiblePlans(plans: any[]) {
  const activePlans = plans.filter(plan => toBoolean(plan.is_active, true))
  const lifetimePlans = activePlans.filter(isLifetimePlan)
  return (lifetimePlans.length > 0 ? lifetimePlans : activePlans).sort((a, b) => {
    const aRecommended = toBoolean(a.is_recommended) ? 1 : 0
    const bRecommended = toBoolean(b.is_recommended) ? 1 : 0
    return bRecommended - aRecommended
  })
}

async function serializeCustomer(customer: any) {
  const subscription = await getActiveSubscription(customer.id)
  const activeDevices = await rest<any[]>('GET',
    `customer_devices?customer_id=eq.${encodeURIComponent(customer.id)}&status=eq.active&select=id`
  )
  const expiresAt = subscription?.expires_at ?? null
  const expired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false
  const subStatus = customer.status !== 'active'
    ? customer.status
    : subscription
      ? (expired ? 'expired' : subscription.status)
      : null

  return {
    id: customer.id,
    auth_user_id: customer.auth_user_id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    role: 'buyer',
    status: customer.status,
    force_popup_code: customer.force_popup_code ?? null,
    force_popup_until: customer.force_popup_until ?? null,
    plan_code: subscription?.subscription_plans?.code ?? null,
    plan_name: subscription?.subscription_plans?.name ?? null,
    sub_status: subStatus,
    expired_at: expiresAt,
    active_devices: activeDevices.length,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
  }
}

async function serializePayment(payment: any) {
  return {
    id: payment.id,
    user_id: payment.customer_id,
    user_name: payment.license_customers?.name ?? '-',
    user_email: payment.license_customers?.email ?? '-',
    plan_code: payment.subscription_plans?.code ?? null,
    plan_name: payment.subscription_plans?.name ?? null,
    amount: Number(payment.amount ?? 0),
    currency: payment.currency ?? 'IDR',
    method: payment.method,
    status: payment.status === 'success' ? 'paid' : payment.status,
    provider: payment.provider ?? 'manual',
    invoice_number: payment.invoice_number ?? payment.external_ref ?? null,
    external_ref: payment.external_ref ?? null,
    payment_url: payment.payment_url ?? null,
    expires_at: payment.expires_at ?? null,
    notes: payment.notes,
    paid_at: payment.paid_at,
    created_at: payment.created_at,
  }
}

async function getProfileById(id?: string | null) {
  if (!id) return null
  const rows = await rest<any[]>('GET',
    `profiles?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  )
  return rows[0] ?? null
}

async function serializeAppDevice(device: any) {
  const profile = await getProfileById(device.profile_id)
  const customer = device.customer_id ? await getCustomerById(device.customer_id) : null
  const subscription = device.customer_id ? await getActiveSubscription(device.customer_id) : null
  const expiresAt = subscription?.expires_at ?? null
  const licenseStatus = customer?.status && customer.status !== 'active'
    ? customer.status
    : expiresAt && new Date(expiresAt).getTime() < Date.now()
      ? 'expired'
      : subscription?.status ?? device.license_status ?? 'active'

  return {
    id: device.id,
    customer_id: device.customer_id,
    profile_id: device.profile_id,
    user_id: device.user_id,
    user_name: customer?.name ?? profile?.name ?? '-',
    user_email: customer?.email ?? profile?.email ?? '-',
    user_role: profile?.role ?? (customer ? 'buyer' : 'developer'),
    customer_status: customer?.status ?? profile?.status ?? null,
    device_id: device.device_id,
    device_name: device.device_name,
    platform: device.platform,
    os_name: device.operating_system ?? device.platform,
    operating_system: device.operating_system ?? device.platform,
    app_version: device.app_version,
    ip_address: device.metadata?.ip_address ?? null,
    status: device.status,
    license_status: licenseStatus,
    plan_code: subscription?.subscription_plans?.code ?? null,
    plan_name: subscription?.subscription_plans?.name ?? null,
    activated_at: subscription?.started_at ?? device.created_at,
    expired_at: expiresAt,
    first_seen_at: device.created_at,
    last_seen_at: device.last_seen,
    revoked_at: device.blocked_at,
    legacy_device_id: device.legacy_device_id ?? null,
    metadata: device.metadata ?? {},
  }
}

async function getAppDeviceById(id: string) {
  const rows = await rest<any[]>('GET',
    `app_devices?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  )
  return rows[0] ?? null
}

async function patchDeviceStatus(id: string, status: 'active' | 'blocked', adminId: string) {
  const device = await getAppDeviceById(id)
  if (!device) return null
  const patch = status === 'blocked'
    ? { status: 'blocked', blocked_at: nowIso(), blocked_by: adminId, updated_at: nowIso() }
    : { status: 'active', blocked_at: null, blocked_by: null, last_seen: nowIso(), updated_at: nowIso() }
  const rows = await rest<any[]>('PATCH',
    `app_devices?id=eq.${encodeURIComponent(id)}&select=*`,
    patch,
    'return=representation')
  if (device.legacy_device_id) {
    await rest('PATCH',
      `customer_devices?id=eq.${encodeURIComponent(device.legacy_device_id)}`,
      status === 'blocked'
        ? { status: 'blocked', revoked_at: nowIso(), revoked_by: adminId }
        : { status: 'active', revoked_at: null, revoked_by: null, last_seen_at: nowIso() },
      'return=minimal')
  }
  return rows[0] ?? null
}

async function logErrorFromPayload(req: Request, body: any) {
  const email = cleanText(body.email).toLowerCase()
  const customer = await getCustomer({
    customer_id: cleanText(body.customer_id),
    email,
    auth_user_id: cleanText(body.auth_user_id),
  })
  const profileRows = body.user_id
    ? await rest<any[]>('GET', `profiles?auth_user_id=eq.${encodeURIComponent(cleanText(body.user_id))}&select=*&limit=1`)
    : []
  const profile = profileRows[0] ?? (customer ? await getProfileById(customer.profile_id) : null)
  const rows = await rest<any[]>('POST', 'error_logs?select=*', {
    profile_id: profile?.id ?? null,
    user_id: cleanText(body.user_id) || profile?.auth_user_id || null,
    customer_id: customer?.id ?? null,
    device_id: cleanText(body.device_id ?? body.device?.device_id ?? body.device?.deviceId) || null,
    error_type: cleanText(body.error_type) || 'application',
    error_message: cleanText(body.error_message ?? body.message) || 'Unknown error',
    stack_trace: nullableText(body.stack_trace ?? body.stack),
    app_version: nullableText(body.app_version ?? body.device?.app_version ?? body.device?.appVersion),
    platform: nullableText(body.platform ?? body.device?.platform),
    metadata: body.metadata ?? {},
  }, 'return=representation')
  await logActivity({ req, customer_id: customer?.id ?? null, event_type: 'error', action: 'ERROR_REPORTED', metadata: { error_type: body.error_type ?? 'application' } })
  return rows[0]
}

async function createSubscription(input: {
  customerId: string
  plan: any
  durationDays?: number
  expiresAt?: string | null
  source: string
  notes?: string | null
  replaceActive?: boolean
}) {
  const durationDays = toPlanDurationDays(input.durationDays, Number(input.plan.duration_days ?? 30))
  const lifetime = isLifetimePlan(input.plan, durationDays)
  const now = new Date()
  const currentRows = await rest<any[]>('GET',
    `customer_subscriptions?customer_id=eq.${encodeURIComponent(input.customerId)}&status=eq.active&select=expires_at&order=expires_at.desc&limit=1`
  )
  const currentExpiryMs = currentRows[0]?.expires_at ? new Date(currentRows[0].expires_at).getTime() : 0
  const requestedExpiry = input.expiresAt ? new Date(input.expiresAt) : null
  const startsAt = requestedExpiry
    ? now
    : !lifetime && Number.isFinite(currentExpiryMs) && currentExpiryMs > now.getTime()
      ? new Date(currentExpiryMs)
      : now
  const expiresAt = lifetime
    ? null
    : requestedExpiry && Number.isFinite(requestedExpiry.getTime())
      ? requestedExpiry.toISOString()
      : new Date(startsAt.getTime() + durationDays * 86400000).toISOString()

  if (input.replaceActive) {
    await rest('PATCH',
      `customer_subscriptions?customer_id=eq.${encodeURIComponent(input.customerId)}&status=eq.active`,
      { status: 'inactive' },
      'return=minimal')
  }

  const rows = await rest<any[]>('POST', 'customer_subscriptions?select=*,subscription_plans(*)', {
    customer_id: input.customerId,
    plan_id: input.plan.id,
    status: 'active',
    started_at: startsAt.toISOString(),
    expires_at: expiresAt,
    source: input.source,
    notes: input.notes ?? null,
  }, 'return=representation')

  await rest('PATCH',
    `license_customers?id=eq.${encodeURIComponent(input.customerId)}`,
    { status: 'active', updated_at: now.toISOString() },
    'return=minimal')

  return rows[0]
}

function planPayloadFromBody(body: any, partial = false) {
  const payload: Record<string, unknown> = {}
  const assign = (key: string, value: unknown) => {
    if (!partial || value !== undefined) payload[key] = value
  }

  if (!partial || body.code !== undefined) assign('code', normalizePlanCode(body.code))
  if (!partial || body.name !== undefined) assign('name', cleanText(body.name))
  if (!partial || body.description !== undefined) assign('description', nullableText(body.description))
  if (!partial || body.price !== undefined) assign('price', toNumber(body.price, 0))
  if (!partial || body.currency !== undefined) assign('currency', cleanText(body.currency) || 'IDR')
  if (!partial || body.duration_days !== undefined) assign('duration_days', toPlanDurationDays(body.duration_days, 30))
  if (!partial || body.is_active !== undefined) assign('is_active', toBoolean(body.is_active, true))
  if (!partial || body.is_recommended !== undefined) assign('is_recommended', toBoolean(body.is_recommended, false))
  if (!partial || body.max_devices !== undefined) assign('max_devices', Math.trunc(toNumber(body.max_devices, 1)))
  if (!partial || body.max_transactions_per_day !== undefined) assign('max_transactions_per_day', Math.trunc(toNumber(body.max_transactions_per_day, -1)))
  if (!partial || body.max_products !== undefined) assign('max_products', Math.trunc(toNumber(body.max_products, -1)))
  if (!partial || body.max_users !== undefined) assign('max_users', Math.trunc(toNumber(body.max_users, 1)))
  if (!partial || body.feature_flags !== undefined) assign('feature_flags', body.feature_flags ?? {})
  if (!partial || body.sort_order !== undefined) assign('sort_order', Math.trunc(toNumber(body.sort_order, 0)))
  if (partial) payload.updated_at = new Date().toISOString()
  return payload
}

async function createMidtransSnap(input: { orderId: string; amount: number; customer: any; plan: any }) {
  if (!MIDTRANS_SERVER_KEY) {
    throw new Error('MIDTRANS_SERVER_KEY belum diset di Supabase Edge Function secrets')
  }

  const callbacks = APP_PUBLIC_URL
    ? {
        finish: `${APP_PUBLIC_URL.replace(/\/$/, '')}/payment/success`,
        unfinish: `${APP_PUBLIC_URL.replace(/\/$/, '')}/payment/pending`,
        error: `${APP_PUBLIC_URL.replace(/\/$/, '')}/payment/failed`,
      }
    : undefined

  const response = await fetch(midtransBaseUrl(), {
    method: 'POST',
    headers: {
      Authorization: midtransAuthHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: Math.round(input.amount),
      },
      customer_details: {
        first_name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone ?? undefined,
      },
      item_details: [{
        id: input.plan.code,
        name: `Langganan ${input.plan.name}`.slice(0, 50),
        price: Math.round(input.amount),
        quantity: 1,
      }],
      enabled_payments: [
        'gopay',
        'shopeepay',
        'bank_transfer',
        'bca_va',
        'bni_va',
        'bri_va',
        'echannel',
        'permata_va',
        'other_va',
      ],
      expiry: { unit: 'day', duration: 1 },
      custom_field1: input.customer.id,
      custom_field2: input.plan.id,
      custom_field3: input.plan.code,
      ...(callbacks ? { callbacks } : {}),
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload?.error_messages?.join(', ') ?? payload?.message ?? `Midtrans error ${response.status}`
    throw new Error(message)
  }
  return payload
}

async function handleCreatePaymentInvoice(req: Request) {
  const body = await req.json().catch(() => ({}))
  const customer = await getCustomer({
    customer_id: cleanText(body.customer_id),
    email: cleanText(body.email).toLowerCase(),
  })
  if (!customer) return fail('Akun pembeli tidak ditemukan', 404)
  if (customer.status === 'blocked' || customer.status === 'suspended') {
    return fail('Akun pembeli diblokir atau ditangguhkan', 403, {
      status: customer.status,
      error_code: statusErrorCode(customer.status),
      popup: await getPopup('BLOCKED'),
    })
  }

  const plan = await getPlanByCode(body.plan_code)
  if (!plan || !toBoolean(plan.is_active, true)) return fail('Paket tidak ditemukan atau tidak aktif', 404)

  const amount = Math.round(Number(plan.price ?? 0))
  if (amount <= 0) return fail('Paket gratis tidak membutuhkan pembayaran')

  const orderId = invoiceNumber()
  const midtrans = await createMidtransSnap({ orderId, amount, customer, plan })
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const rows = await rest<any[]>('POST', 'payments?select=*,license_customers(id,name,email),subscription_plans(code,name)', {
    customer_id: customer.id,
    plan_id: plan.id,
    amount,
    currency: plan.currency ?? 'IDR',
    method: 'midtrans_snap',
    status: 'pending',
    provider: 'midtrans',
    invoice_number: orderId,
    external_ref: orderId,
    payment_token: midtrans.token ?? null,
    payment_url: midtrans.redirect_url ?? null,
    expires_at: expiresAt,
    raw_payload: { create_response: midtrans },
    notes: nullableText(body.notes),
  }, 'return=representation')

  await logActivity({
    req,
    customer_id: customer.id,
    event_type: 'payment',
    action: 'PAYMENT_INVOICE_CREATED',
    metadata: { payment_id: rows[0]?.id, order_id: orderId, plan_code: plan.code, provider: 'midtrans' },
  })

  return ok(await serializePayment(rows[0]), 'Invoice pembayaran dibuat')
}

async function handleCreateManualPaymentRequest(req: Request) {
  const body = await req.json().catch(() => ({}))
  const customer = await getCustomer({
    customer_id: cleanText(body.customer_id),
    email: cleanText(body.email).toLowerCase(),
  })
  if (!customer) return fail('Akun pembeli tidak ditemukan', 404)
  if (customer.status === 'blocked' || customer.status === 'suspended') {
    return fail('Akun pembeli diblokir atau ditangguhkan', 403, {
      status: customer.status,
      error_code: statusErrorCode(customer.status),
      popup: await getPopup('BLOCKED'),
    })
  }

  const plan = await getPlanByCode(body.plan_code)
  if (!plan || !toBoolean(plan.is_active, true)) return fail('Paket tidak ditemukan atau tidak aktif', 404)

  const amount = Math.round(Number(plan.price ?? 0))
  if (amount <= 0) return fail('Paket gratis tidak membutuhkan pembayaran')

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const existingRows = await rest<any[]>('GET',
    `payments?customer_id=eq.${encodeURIComponent(customer.id)}&plan_id=eq.${encodeURIComponent(plan.id)}&status=eq.pending&provider=eq.manual_whatsapp&created_at=gte.${encodeURIComponent(since)}&select=*,license_customers(id,name,email),subscription_plans(code,name)&order=created_at.desc&limit=1`
  )

  const makeResponse = async (payment: any) => {
    const orderId = payment.external_ref ?? payment.invoice_number
    const message = buildManualPaymentMessage({ orderId, customer, plan, amount })
    const whatsappUrl = payment.payment_url || buildWhatsappUrl(DEVELOPER_WHATSAPP, message)
    return {
      ...(await serializePayment(payment)),
      payment_url: whatsappUrl,
      whatsapp_number: normalizeWhatsapp(DEVELOPER_WHATSAPP),
      whatsapp_message: message,
    }
  }

  if (existingRows[0]) {
    return ok(await makeResponse(existingRows[0]), 'Request pembayaran pending sudah ada')
  }

  const orderId = invoiceNumber()
  const message = buildManualPaymentMessage({ orderId, customer, plan, amount })
  const whatsappUrl = buildWhatsappUrl(DEVELOPER_WHATSAPP, message)
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

  const rows = await rest<any[]>('POST', 'payments?select=*,license_customers(id,name,email),subscription_plans(code,name)', {
    customer_id: customer.id,
    plan_id: plan.id,
    amount,
    currency: plan.currency ?? 'IDR',
    method: 'whatsapp_manual',
    status: 'pending',
    provider: 'manual_whatsapp',
    invoice_number: orderId,
    external_ref: orderId,
    payment_url: whatsappUrl,
    expires_at: expiresAt,
    raw_payload: { whatsapp_message: message, whatsapp_number: normalizeWhatsapp(DEVELOPER_WHATSAPP) },
    notes: nullableText(body.notes) ?? 'Manual payment request via WhatsApp developer',
  }, 'return=representation')

  await logActivity({
    req,
    customer_id: customer.id,
    event_type: 'payment',
    action: 'MANUAL_PAYMENT_REQUESTED',
    metadata: { payment_id: rows[0]?.id, order_id: orderId, plan_code: plan.code, provider: 'manual_whatsapp' },
  })

  return ok(await makeResponse(rows[0]), 'Request pembayaran manual dibuat')
}

async function handlePaymentStatus(req: Request) {
  const url = new URL(req.url)
  const externalRef = cleanText(url.searchParams.get('external_ref'))
  if (!externalRef) return fail('external_ref wajib diisi')

  const rows = await rest<any[]>('GET',
    `payments?external_ref=eq.${encodeURIComponent(externalRef)}&select=*,license_customers(id,name,email),subscription_plans(code,name)&limit=1`
  )
  if (!rows[0]) return fail('Payment tidak ditemukan', 404)
  return ok(await serializePayment(rows[0]))
}

function compareVersions(a: string, b: string) {
  const pa = a.split(/[.-]/).map(part => Number.parseInt(part, 10) || 0)
  const pb = b.split(/[.-]/).map(part => Number.parseInt(part, 10) || 0)
  const max = Math.max(pa.length, pb.length)
  for (let i = 0; i < max; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

async function handleAppUpdateCheck(req: Request) {
  const url = new URL(req.url)
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const platform = cleanText(body.platform ?? url.searchParams.get('platform')).toLowerCase() || 'all'
  const currentVersion = cleanText(body.app_version ?? body.current_version ?? url.searchParams.get('version'))
  const rows = await rest<any[]>('GET', 'app_updates?is_active=eq.true&select=*&order=updated_at.desc')
  const update = rows.find(row => String(row.platform).toLowerCase() === platform)
    ?? rows.find(row => row.platform === 'all')
    ?? null
  if (!update) return ok({ update_required: false, update_available: false })
  const belowMinimum = currentVersion ? compareVersions(currentVersion, String(update.minimum_version)) < 0 : false
  const belowLatest = currentVersion ? compareVersions(currentVersion, String(update.latest_version)) < 0 : false
  return ok({
    ...update,
    update_required: update.mode === 'force' || belowMinimum,
    update_available: belowLatest,
    current_version: currentVersion || null,
  })
}

async function handleHeartbeat(req: Request) {
  const body = await req.json().catch(() => ({}))
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (token) {
    const authUser = await authRequest<any>('GET', '/user', undefined, ANON_KEY, token)
    const admins = await rest<any[]>('GET',
      `license_admins?user_id=eq.${encodeURIComponent(authUser.id)}&is_active=eq.true&select=user_id,role`
    )
    if (admins[0]) {
      const device = await upsertAdminDevice(authUser, admins[0].role, body)
      return ok({ device }, 'Heartbeat developer diterima')
    }
  }

  const customer = await getCustomer({
    customer_id: cleanText(body.customer_id),
    email: cleanText(body.email).toLowerCase(),
    auth_user_id: cleanText(body.auth_user_id),
  })
  if (!customer) return fail('Akun tidak ditemukan', 404)
  const subscription = await getLatestSubscription(customer.id)
  const plan = subscription?.subscription_plans ?? await getTrialPlan()
  const deviceCheck = await validateDevice(customer.id, plan, body.device ?? body.deviceInfo ?? body)
  return ok({ customer_id: customer.id, device: deviceCheck.device }, 'Heartbeat diterima')
}

async function handlePublicAnnouncements(req: Request) {
  const url = new URL(req.url)
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  const platform = cleanText(body.platform ?? url.searchParams.get('platform')).toLowerCase()
  const customer = await getCustomer({
    customer_id: cleanText(body.customer_id ?? url.searchParams.get('customer_id')),
    email: cleanText(body.email ?? url.searchParams.get('email')).toLowerCase(),
    auth_user_id: cleanText(body.auth_user_id ?? url.searchParams.get('auth_user_id')),
  })
  const subscription = customer ? await getActiveSubscription(customer.id) : null
  const planCode = subscription?.subscription_plans?.code ?? null
  const rows = await rest<any[]>('GET', 'announcements?is_active=eq.true&select=*&order=created_at.desc')
  const now = Date.now()
  const filtered = rows.filter(row => {
    if (row.starts_at && new Date(row.starts_at).getTime() > now) return false
    if (row.ends_at && new Date(row.ends_at).getTime() <= now) return false
    if (row.target_scope === 'all') return true
    if (row.target_scope === 'platform') return !row.target_platform || String(row.target_platform).toLowerCase() === platform
    if (row.target_scope === 'plan') return planCode && row.target_plan_code === planCode
    if (row.target_scope === 'user') return customer && (!row.target_customer_id || row.target_customer_id === customer.id)
    return false
  })
  return ok(filtered)
}

async function handleReportError(req: Request) {
  const body = await req.json().catch(() => ({}))
  const row = await logErrorFromPayload(req, body)
  return ok(row, 'Error log diterima')
}

async function handleMidtransWebhook(req: Request) {
  const payload = await req.json().catch(() => null)
  if (!payload?.order_id) return fail('Payload Midtrans tidak valid', 400)
  if (!(await verifyMidtransSignature(payload))) return fail('Signature Midtrans tidak valid', 401)

  const orderId = String(payload.order_id)
  const rows = await rest<any[]>('GET',
    `payments?external_ref=eq.${encodeURIComponent(orderId)}&select=*,license_customers(id,name,email),subscription_plans(*)&limit=1`
  )
  const payment = rows[0]
  if (!payment) return fail('Payment tidak ditemukan', 404)

  const nextStatus = mapPaymentStatus(String(payload.transaction_status ?? ''), payload.fraud_status)
  const wasPaid = isPaymentPaid(payment.status)
  const paidAt = nextStatus === 'paid' ? (payload.settlement_time ? new Date(payload.settlement_time).toISOString() : nowIso()) : payment.paid_at

  await rest('POST', 'payment_events', {
    payment_id: payment.id,
    provider: 'midtrans',
    event_type: String(payload.transaction_status ?? 'notification'),
    external_ref: orderId,
    payload,
  })

  const updated = await rest<any[]>('PATCH',
    `payments?id=eq.${encodeURIComponent(payment.id)}&select=*,license_customers(id,name,email),subscription_plans(code,name)`,
    {
      status: nextStatus,
      gateway_transaction_id: payload.transaction_id ?? payment.gateway_transaction_id ?? null,
      gateway_status: payload.transaction_status ?? null,
      method: payload.payment_type ? `midtrans_${payload.payment_type}` : payment.method,
      paid_at: paidAt,
      raw_payload: payload,
      updated_at: nowIso(),
    },
    'return=representation')

  let subscription = null
  if (nextStatus === 'paid' && !wasPaid && payment.customer_id && payment.plan_id && payment.subscription_plans) {
    subscription = await createSubscription({
      customerId: payment.customer_id,
      plan: payment.subscription_plans,
      source: 'payment',
      notes: `Auto extend from Midtrans ${orderId}`,
    })
    await logActivity({
      req,
      customer_id: payment.customer_id,
      event_type: 'payment',
      action: 'PAYMENT_PAID_AUTO_EXTENDED',
      metadata: { payment_id: payment.id, order_id: orderId, subscription_id: subscription?.id ?? null },
    })
  }

  return ok({ payment: await serializePayment(updated[0]), subscription }, 'Webhook diproses')
}

async function handleAdmin(req: Request, pathname: string) {
  const admin = await getAdminFromRequest(req)
  const userPath = pathname.match(/^\/admin\/users\/([^/]+)$/)
  const userPlanPath = pathname.match(/^\/admin\/users\/([^/]+)\/plan$/)
  const userResetPath = pathname.match(/^\/admin\/users\/([^/]+)\/reset-password$/)
  const planPath = pathname.match(/^\/admin\/plans\/([^/]+)$/)
  const planFeaturesPath = pathname.match(/^\/admin\/plans\/([^/]+)\/features$/)
  const featurePath = pathname.match(/^\/admin\/features\/([^/]+)$/)
  const popupPath = pathname.match(/^\/admin\/popups\/([^/]+)$/)
  const announcementPath = pathname.match(/^\/admin\/announcements\/([^/]+)$/)
  const paymentPath = pathname.match(/^\/admin\/payments\/([^/]+)$/)
  const paymentApprovePath = pathname.match(/^\/admin\/payments\/([^/]+)\/approve$/)
  const deviceDetailPath = pathname.match(/^\/admin\/devices\/([^/]+)$/)
  const deviceRevokePath = pathname.match(/^\/admin\/devices\/([^/]+)\/revoke$/)
  const deviceBlockPath = pathname.match(/^\/admin\/devices\/([^/]+)\/block$/)
  const deviceUnblockPath = pathname.match(/^\/admin\/devices\/([^/]+)\/unblock$/)
  const deviceSuspendLicensePath = pathname.match(/^\/admin\/devices\/([^/]+)\/suspend-license$/)
  const deviceActivateLicensePath = pathname.match(/^\/admin\/devices\/([^/]+)\/activate-license$/)
  const deviceExtendLicensePath = pathname.match(/^\/admin\/devices\/([^/]+)\/extend-license$/)

  if (req.method === 'GET' && pathname === '/admin/stats') {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const [profiles, customers, subscriptions, payments, devices, errors, activity, updates] = await Promise.all([
      rest<any[]>('GET', 'profiles?select=id,role,status,created_at'),
      rest<any[]>('GET', 'license_customers?select=id,status,created_at'),
      rest<any[]>('GET', 'customer_subscriptions?select=id,status,expires_at,created_at,source,plan_id,subscription_plans(code,name)'),
      rest<any[]>('GET', 'payments?select=id,status,amount,paid_at,created_at,subscription_plans(code,name)'),
      rest<any[]>('GET', 'app_devices?select=id,status,last_seen,platform,app_version'),
      rest<any[]>('GET', 'error_logs?select=id,error_type,error_message,user_id,device_id,created_at&order=created_at.desc&limit=20'),
      rest<any[]>('GET', 'license_activity_logs?select=id,event_type,action,metadata,created_at&order=created_at.desc&limit=20'),
      rest<any[]>('GET', 'app_updates?is_active=eq.true&select=platform,latest_version,minimum_version,mode&order=updated_at.desc'),
    ])
    const onlineSince = Date.now() - 5 * 60 * 1000
    const paidPayments = payments.filter(payment => isPaymentPaid(String(payment.status)))
    const revenue = paidPayments
      .filter(payment => isPaymentPaid(String(payment.status)))
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
    const revenueMonth = paidPayments
      .filter(payment => new Date(payment.paid_at ?? payment.created_at).toISOString() >= monthStart)
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
    const revenueYear = paidPayments
      .filter(payment => new Date(payment.paid_at ?? payment.created_at).toISOString() >= yearStart)
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
    const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(new Date().getFullYear(), index, 1)
      const key = `${date.getFullYear()}-${String(index + 1).padStart(2, '0')}`
      const total = paidPayments
        .filter(payment => String(payment.paid_at ?? payment.created_at).slice(0, 7) === key)
        .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
      return { month: key, total }
    })
    const platformCounts = devices.reduce((acc: Record<string, number>, device) => {
      const key = String(device.platform ?? 'unknown').toLowerCase()
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
    const versionCounts = devices.reduce((acc: Record<string, number>, device) => {
      const key = String(device.app_version ?? 'unknown')
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
    const planCounts = subscriptions.reduce((acc: Record<string, number>, sub) => {
      const key = String(sub.subscription_plans?.code ?? 'unknown')
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    return ok({
      users: customers.length,
      total_users: customers.length,
      total_profiles: profiles.length,
      total_devices: devices.length,
      active_users: customers.filter(customer => customer.status === 'active').length,
      blocked_users: customers.filter(customer => customer.status === 'blocked').length,
      user_online: devices.filter(device =>
        device.status === 'active' && device.last_seen && new Date(device.last_seen).getTime() >= onlineSince
      ).length,
      active_subscriptions: subscriptions.filter(sub =>
        sub.status === 'active' && (!sub.expires_at || new Date(sub.expires_at).getTime() >= Date.now())
      ).length,
      expired_subscriptions: subscriptions.filter(sub =>
        sub.status === 'expired' || (sub.expires_at && new Date(sub.expires_at).getTime() < Date.now())
      ).length,
      revenue,
      revenue_month: revenueMonth,
      revenue_year: revenueYear,
      payments: payments.length,
      paid_payments: paidPayments.length,
      device_online: devices.filter(device =>
        device.status === 'active' && device.last_seen && new Date(device.last_seen).getTime() >= onlineSince
      ).length,
      active_devices: devices.filter(device => device.status === 'active').length,
      blocked_devices: devices.filter(device => device.status === 'blocked' || device.status === 'revoked').length,
      total_transactions: paidPayments.length,
      active_versions: versionCounts,
      platform_counts: platformCounts,
      top_plans: Object.entries(planCounts as Record<string, number>)
        .map(([code, count]) => ({ code, count: Number(count) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      revenue_by_month: monthlyRevenue,
      recent_activity: activity,
      recent_errors: errors,
      updates,
      generated_at: nowIso(),
    })
  }

  if (req.method === 'GET' && pathname === '/admin/devices') {
    const url = new URL(req.url)
    const search = cleanText(url.searchParams.get('search')).toLowerCase()
    const status = cleanText(url.searchParams.get('status')).toLowerCase()
    const platform = cleanText(url.searchParams.get('platform')).toLowerCase()
    const rows = await rest<any[]>('GET', 'app_devices?select=*&order=last_seen.desc')
    const filtered = rows.filter(row => {
      if (status && row.status !== status) return false
      if (platform && String(row.platform ?? '').toLowerCase() !== platform) return false
      if (!search) return true
      const haystack = `${row.device_id ?? ''} ${row.device_name ?? ''} ${row.platform ?? ''}`.toLowerCase()
      return haystack.includes(search)
    })
    const serialized = await Promise.all(filtered.map(serializeAppDevice))
    const searched = search
      ? serialized.filter(row => `${row.user_name} ${row.user_email} ${row.device_id} ${row.device_name ?? ''} ${row.platform ?? ''}`.toLowerCase().includes(search))
      : serialized
    return ok(searched)
  }

  if (deviceDetailPath && req.method === 'GET') {
    const id = decodeURIComponent(deviceDetailPath[1])
    const device = await getAppDeviceById(id)
    if (!device) return fail('Device tidak ditemukan', 404)
    const detail = await serializeAppDevice(device)
    const loginHistory = device.customer_id
      ? await rest<any[]>('GET',
          `license_activity_logs?customer_id=eq.${encodeURIComponent(device.customer_id)}&event_type=eq.login&select=*&order=created_at.desc&limit=20`)
      : await rest<any[]>('GET',
          `activity_logs?user_id=eq.${encodeURIComponent(device.user_id)}&event_type=eq.login&select=*&order=created_at.desc&limit=20`)
    return ok({ ...detail, login_history: loginHistory })
  }

  if (req.method === 'GET' && pathname === '/admin/app-update') {
    const rows = await rest<any[]>('GET', 'app_updates?select=*&order=platform.asc')
    return ok(rows)
  }

  if (req.method === 'PATCH' && pathname === '/admin/app-update') {
    const body = await req.json().catch(() => ({}))
    const platform = cleanText(body.platform || 'all').toLowerCase() || 'all'
    if (!['all', 'windows', 'linux', 'macos', 'android', 'ios'].includes(platform)) return fail('Platform update tidak valid')
    const payload = {
      platform,
      latest_version: cleanText(body.latest_version) || '2.0.0',
      minimum_version: cleanText(body.minimum_version) || cleanText(body.latest_version) || '2.0.0',
      release_notes: nullableText(body.release_notes),
      download_url: nullableText(body.download_url),
      mode: cleanText(body.mode) === 'force' ? 'force' : 'optional',
      is_active: body.is_active === undefined ? true : toBoolean(body.is_active),
      created_by: admin.id,
      updated_at: nowIso(),
    }
    const rows = await rest<any[]>('POST',
      'app_updates?on_conflict=platform&select=*',
      payload,
      'resolution=merge-duplicates,return=representation')
    await logActivity({ req, actor_user_id: admin.id, event_type: 'update', action: 'APP_UPDATE_RULE_SAVED', metadata: { platform, mode: payload.mode } })
    return ok(rows[0], 'Aturan update aplikasi disimpan')
  }

  if (req.method === 'GET' && pathname === '/admin/errors') {
    const url = new URL(req.url)
    const type = cleanText(url.searchParams.get('type')).toLowerCase()
    const rows = await rest<any[]>('GET', 'error_logs?select=*,profiles(id,name,email,role),license_customers(id,name,email)&order=created_at.desc&limit=200')
    const filtered = type ? rows.filter(row => String(row.error_type ?? '').toLowerCase() === type) : rows
    const counts = filtered.reduce((acc: Record<string, number>, row) => {
      const key = String(row.error_type ?? 'application')
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
    return ok({
      total: filtered.length,
      by_type: counts,
      rows: filtered.map(row => ({
        ...row,
        user_name: row.license_customers?.name ?? row.profiles?.name ?? '-',
        user_email: row.license_customers?.email ?? row.profiles?.email ?? '-',
      })),
    })
  }

  if (req.method === 'GET' && pathname === '/admin/announcements') {
    const rows = await rest<any[]>('GET', 'announcements?select=*&order=created_at.desc')
    return ok(rows)
  }

  if (req.method === 'POST' && pathname === '/admin/announcements') {
    const body = await req.json().catch(() => ({}))
    const title = cleanText(body.title)
    const message = cleanText(body.message)
    if (!title || !message) return fail('Judul dan pesan pengumuman wajib diisi')
    const payload = {
      type: cleanText(body.type) || 'announcement',
      title,
      message,
      severity: cleanText(body.severity) || 'info',
      target_scope: cleanText(body.target_scope) || 'all',
      target_user_id: nullableText(body.target_user_id),
      target_customer_id: nullableText(body.target_customer_id),
      target_plan_code: nullableText(body.target_plan_code),
      target_platform: nullableText(body.target_platform),
      cta_text: nullableText(body.cta_text),
      cta_url: nullableText(body.cta_url),
      starts_at: nullableText(body.starts_at) ?? nowIso(),
      ends_at: nullableText(body.ends_at),
      is_active: body.is_active === undefined ? true : toBoolean(body.is_active),
      created_by: admin.id,
    }
    const rows = await rest<any[]>('POST', 'announcements?select=*', payload, 'return=representation')
    await logActivity({ req, actor_user_id: admin.id, event_type: 'announcement', action: 'ANNOUNCEMENT_CREATED', metadata: { announcement_id: rows[0]?.id, target_scope: payload.target_scope } })
    return ok(rows[0], 'Pengumuman dikirim')
  }

  if (announcementPath && req.method === 'PATCH') {
    const id = decodeURIComponent(announcementPath[1])
    const body = await req.json().catch(() => ({}))
    const allowed = ['type', 'title', 'message', 'severity', 'target_scope', 'target_user_id', 'target_customer_id', 'target_plan_code', 'target_platform', 'cta_text', 'cta_url', 'starts_at', 'ends_at', 'is_active']
    const payload: Record<string, unknown> = { updated_at: nowIso() }
    for (const key of allowed) {
      if (body[key] !== undefined) payload[key] = key === 'is_active' ? toBoolean(body[key]) : nullableText(body[key])
    }
    const rows = await rest<any[]>('PATCH', `announcements?id=eq.${encodeURIComponent(id)}&select=*`, payload, 'return=representation')
    if (!rows[0]) return fail('Pengumuman tidak ditemukan', 404)
    await logActivity({ req, actor_user_id: admin.id, event_type: 'announcement', action: 'ANNOUNCEMENT_UPDATED', metadata: { announcement_id: id } })
    return ok(rows[0], 'Pengumuman diperbarui')
  }

  if (announcementPath && req.method === 'DELETE') {
    const id = decodeURIComponent(announcementPath[1])
    await rest('DELETE', `announcements?id=eq.${encodeURIComponent(id)}`, undefined, 'return=minimal')
    await logActivity({ req, actor_user_id: admin.id, event_type: 'announcement', action: 'ANNOUNCEMENT_DELETED', metadata: { announcement_id: id } })
    return ok({ id }, 'Pengumuman dihapus')
  }

  if (req.method === 'GET' && pathname === '/admin/revenue') {
    const payments = await rest<any[]>('GET', 'payments?select=*,subscription_plans(code,name)&order=created_at.asc')
    const subscriptions = await rest<any[]>('GET', 'customer_subscriptions?select=*,subscription_plans(code,name)&order=created_at.asc')
    const paid = payments.filter(payment => isPaymentPaid(String(payment.status)))
    const revenueByMonth = paid.reduce((acc: Record<string, number>, payment) => {
      const key = String(payment.paid_at ?? payment.created_at).slice(0, 7)
      acc[key] = (acc[key] ?? 0) + Number(payment.amount ?? 0)
      return acc
    }, {})
    const planRevenue = paid.reduce((acc: Record<string, { code: string; name: string; total: number; count: number }>, payment) => {
      const code = String(payment.subscription_plans?.code ?? 'manual')
      const current = acc[code] ?? { code, name: String(payment.subscription_plans?.name ?? code), total: 0, count: 0 }
      current.total += Number(payment.amount ?? 0)
      current.count += 1
      acc[code] = current
      return acc
    }, {})
    const planRevenueRows = Object.values(planRevenue) as Array<{ code: string; name: string; total: number; count: number }>
    return ok({
      total_revenue: paid.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0),
      revenue_by_month: Object.entries(revenueByMonth).map(([month, total]) => ({ month, total })),
      plan_revenue: planRevenueRows.sort((a, b) => b.total - a.total),
      active_customers: subscriptions.filter(sub => sub.status === 'active' && (!sub.expires_at || new Date(sub.expires_at).getTime() >= Date.now())).length,
      expired_customers: subscriptions.filter(sub => sub.status === 'expired' || (sub.expires_at && new Date(sub.expires_at).getTime() < Date.now())).length,
      new_subscriptions: subscriptions.filter(sub => sub.source === 'trial' || sub.source === 'manual').length,
      renewals: subscriptions.filter(sub => sub.source === 'payment').length,
    })
  }

  if (req.method === 'GET' && pathname === '/admin/plans') {
    return ok((await listPlansRaw()).map(serializePlan))
  }

  if (req.method === 'POST' && pathname === '/admin/plans') {
    const body = await req.json().catch(() => ({}))
    const payload = planPayloadFromBody(body)
    if (!payload.code || !payload.name) return fail('Kode dan nama paket wajib diisi')
    if (payload.is_recommended) {
      await rest('PATCH', 'subscription_plans?is_recommended=eq.true', { is_recommended: false }, 'return=minimal')
    }
    const rows = await rest<any[]>('POST', 'subscription_plans?select=*', payload, 'return=representation')
    await logActivity({ req, actor_user_id: admin.id, event_type: 'subscription', action: 'PLAN_CREATED', metadata: { code: payload.code } })
    return ok(serializePlan(rows[0]), 'Paket berhasil dibuat')
  }

  if (planPath && req.method === 'PATCH') {
    const id = decodeURIComponent(planPath[1])
    const body = await req.json().catch(() => ({}))
    const payload = planPayloadFromBody(body, true)
    if (payload.is_recommended) {
      await rest('PATCH',
        `subscription_plans?is_recommended=eq.true&id=neq.${encodeURIComponent(id)}`,
        { is_recommended: false },
        'return=minimal')
    }
    const rows = await rest<any[]>('PATCH',
      `subscription_plans?id=eq.${encodeURIComponent(id)}&select=*`,
      payload,
      'return=representation')
    if (!rows[0]) return fail('Paket tidak ditemukan', 404)
    await logActivity({ req, actor_user_id: admin.id, event_type: 'subscription', action: 'PLAN_UPDATED', metadata: { plan_id: id, fields: Object.keys(payload) } })
    return ok(serializePlan(rows[0]), 'Paket berhasil diperbarui')
  }

  if (planPath && req.method === 'DELETE') {
    const id = decodeURIComponent(planPath[1])
    const plan = await getPlanById(id)
    if (!plan) return fail('Paket tidak ditemukan', 404)

    const [subscriptions, payments] = await Promise.all([
      rest<any[]>('GET', `customer_subscriptions?plan_id=eq.${encodeURIComponent(id)}&select=id&limit=1`),
      rest<any[]>('GET', `payments?plan_id=eq.${encodeURIComponent(id)}&select=id&limit=1`),
    ])
    if (subscriptions[0] || payments[0]) {
      return fail('Paket sudah dipakai pembeli atau pembayaran. Nonaktifkan paket kalau tidak ingin dijual lagi.', 409, {
        has_subscriptions: !!subscriptions[0],
        has_payments: !!payments[0],
      })
    }

    await rest('DELETE', `subscription_plans?id=eq.${encodeURIComponent(id)}`, undefined, 'return=minimal')
    await logActivity({ req, actor_user_id: admin.id, event_type: 'subscription', action: 'PLAN_DELETED', metadata: { plan_id: id, code: plan.code } })
    return ok({ id }, 'Paket berhasil dihapus')
  }

  if (planFeaturesPath && req.method === 'GET') {
    const plan = await getPlanById(decodeURIComponent(planFeaturesPath[1]))
    if (!plan) return fail('Paket tidak ditemukan', 404)
    await ensureDefaultFeatureCatalog()
    const features = await rest<any[]>('GET', 'feature_catalog?select=*&order=sort_order.asc')
    const defaults = defaultFeatureFlagsForPlan(plan) ?? {}
    const flags = { ...defaults, ...parseFeatureFlags(plan.feature_flags) }
    return ok(features.map(feature => ({
      ...feature,
      is_active: toBoolean(feature.is_active),
      is_enabled: flags[feature.code] === true ? 1 : 0,
      limit_value: null,
    })))
  }

  if (planFeaturesPath && req.method === 'PUT') {
    const id = decodeURIComponent(planFeaturesPath[1])
    const plan = await getPlanById(id)
    if (!plan) return fail('Paket tidak ditemukan', 404)
    const body = await req.json().catch(() => ({}))
    const nextFlags: Record<string, boolean> = { ...(plan.feature_flags ?? {}) }
    for (const feature of Array.isArray(body.features) ? body.features : []) {
      const code = cleanText(feature.code)
      if (code) nextFlags[code] = toBoolean(feature.enabled)
    }
    await rest('PATCH',
      `subscription_plans?id=eq.${encodeURIComponent(id)}`,
      { feature_flags: nextFlags, updated_at: new Date().toISOString() },
      'return=minimal')
    await logActivity({ req, actor_user_id: admin.id, event_type: 'subscription', action: 'PLAN_FEATURES_UPDATED', metadata: { plan_id: id } })
    return ok({ feature_flags: nextFlags }, 'Fitur paket berhasil disimpan')
  }

  if (req.method === 'GET' && pathname === '/admin/popups') {
    const popups = await rest<any[]>('GET', 'popup_rules?select=*&order=code.asc')
    return ok(popups.map(popup => ({ ...popup, is_active: toBoolean(popup.is_active) ? 1 : 0 })))
  }

  if (popupPath && req.method === 'PATCH') {
    const id = decodeURIComponent(popupPath[1])
    const body = await req.json().catch(() => ({}))
    const allowed = ['title', 'description', 'cta_text', 'cta_url', 'whatsapp_number', 'image_url', 'pricing_html', 'trigger_on', 'severity', 'force_popup_until']
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (body[key] !== undefined) payload[key] = key === 'trigger_on' ? body[key] : nullableText(body[key])
    }
    if (body.is_active !== undefined) payload.is_active = toBoolean(body.is_active)
    if (body.force_popup !== undefined) payload.force_popup = toBoolean(body.force_popup)
    if (body.dismissible !== undefined) payload.dismissible = toBoolean(body.dismissible)
    const rows = await rest<any[]>('PATCH',
      `popup_rules?id=eq.${encodeURIComponent(id)}&select=*`,
      payload,
      'return=representation')
    if (!rows[0]) return fail('Popup tidak ditemukan', 404)
    await logActivity({ req, actor_user_id: admin.id, event_type: 'popup', action: 'POPUP_UPDATED', metadata: { popup_id: id, code: rows[0].code } })
    return ok(rows[0], 'Popup berhasil diperbarui')
  }

  if (req.method === 'GET' && pathname === '/admin/users') {
    const url = new URL(req.url)
    const search = cleanText(url.searchParams.get('search')).toLowerCase()
    const query = search
      ? `license_customers?or=(email.ilike.*${encodeURIComponent(search)}*,name.ilike.*${encodeURIComponent(search)}*)&select=*&order=created_at.desc`
      : 'license_customers?select=*&order=created_at.desc'
    const customers = await rest<any[]>('GET', query)
    return ok(await Promise.all(customers.map(serializeCustomer)))
  }

  if (userPath && req.method === 'GET') {
    const customer = await getCustomerById(decodeURIComponent(userPath[1]))
    if (!customer) return fail('Akun pembeli tidak ditemukan', 404)
    return ok(await serializeCustomer(customer))
  }

  if (req.method === 'POST' && pathname === '/admin/users') {
    const body = await req.json().catch(() => ({}))
    const email = cleanText(body.email).toLowerCase()
    const password = cleanText(body.password)
    const name = cleanText(body.name)
    const phone = cleanText(body.phone)
    if (!name) return fail('Nama wajib diisi')
    if (!isValidEmail(email)) return fail('Email tidak valid')
    if (password.length < 8) return fail('Password minimal 8 karakter')
    if (await getCustomerByEmail(email)) return fail('Email sudah terdaftar', 409)

    const plan = await getPlanByCode(body.plan_code)
    if (!plan) return fail('Paket tidak ditemukan')
    const authUser = await authRequest<any>('POST', '/admin/users', {
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone },
    }, SERVICE_ROLE_KEY)
    const customers = await rest<any[]>('POST', 'license_customers?select=*', {
      auth_user_id: authUser.id,
      name,
      email,
      phone: phone || null,
      status: 'active',
    }, 'return=representation')
    const customer = customers[0]
    await createSubscription({
      customerId: customer.id,
      plan,
      durationDays: body.duration_days,
      source: 'manual',
      notes: nullableText(body.notes),
    })
    await logActivity({ req, actor_user_id: admin.id, customer_id: customer.id, event_type: 'user', action: 'CUSTOMER_CREATED', metadata: { email, plan_code: plan.code } })
    return ok(await serializeCustomer(customer), 'Akun pembeli berhasil dibuat')
  }

  if (userPath && req.method === 'PATCH') {
    const id = decodeURIComponent(userPath[1])
    const body = await req.json().catch(() => ({}))
    const beforeRows = await rest<any[]>('GET',
      `license_customers?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
    )
    const before = beforeRows[0]
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) payload.name = cleanText(body.name)
    if (body.phone !== undefined) payload.phone = nullableText(body.phone)
    if (body.status !== undefined) {
      const status = cleanText(body.status) || 'active'
      if (!['active', 'inactive', 'suspended', 'blocked'].includes(status)) {
        return fail('Status user tidak valid')
      }
      payload.status = status
      if (status === 'blocked' || status === 'suspended' || status === 'inactive') {
        await rest('PATCH',
          `customer_devices?customer_id=eq.${encodeURIComponent(id)}&status=eq.active`,
          { status: 'blocked', revoked_at: nowIso(), revoked_by: admin.id },
          'return=minimal')
      }
    }
    if (body.force_popup_code !== undefined) payload.force_popup_code = nullableText(body.force_popup_code)
    if (body.force_popup_until !== undefined) payload.force_popup_until = nullableText(body.force_popup_until)
    const rows = await rest<any[]>('PATCH',
      `license_customers?id=eq.${encodeURIComponent(id)}&select=*`,
      payload,
      'return=representation')
    if (!rows[0]) return fail('Akun pembeli tidak ditemukan', 404)
    const after = rows[0]
    const changes: Record<string, { before: unknown; after: unknown }> = {}
    for (const key of Object.keys(payload)) {
      if (key === 'updated_at') continue
      if (before?.[key] !== after?.[key]) changes[key] = { before: before?.[key] ?? null, after: after?.[key] ?? null }
    }
    await logActivity({ req, actor_user_id: admin.id, customer_id: id, event_type: 'user', action: 'CUSTOMER_UPDATED', metadata: { fields: Object.keys(changes), changes } })
    return ok(await serializeCustomer(rows[0]), 'Akun pembeli berhasil diperbarui')
  }

  if (userPath && req.method === 'DELETE') {
    const id = decodeURIComponent(userPath[1])
    const customer = await getCustomerById(id)
    if (!customer) return fail('Akun pembeli tidak ditemukan', 404)
    await rest('DELETE', `license_customers?id=eq.${encodeURIComponent(id)}`, undefined, 'return=minimal')
    if (customer.auth_user_id) {
      try {
        await authRequest('DELETE', `/admin/users/${encodeURIComponent(customer.auth_user_id)}`, undefined, SERVICE_ROLE_KEY)
      } catch (error) {
        console.warn('auth user delete skipped', error)
      }
    }
    await logActivity({ req, actor_user_id: admin.id, event_type: 'user', action: 'CUSTOMER_DELETED', metadata: { customer_id: id, email: customer.email } })
    return ok({ id }, 'Akun pembeli berhasil dihapus')
  }

  if (userResetPath && req.method === 'POST') {
    const id = decodeURIComponent(userResetPath[1])
    const customer = await getCustomerById(id)
    if (!customer?.auth_user_id) return fail('Akun auth pembeli tidak ditemukan', 404)
    const body = await req.json().catch(() => ({}))
    const newPassword = cleanText(body.new_password) || randomPassword()
    if (newPassword.length < 8) return fail('Password minimal 8 karakter')
    await authRequest('PUT', `/admin/users/${encodeURIComponent(customer.auth_user_id)}`, { password: newPassword }, SERVICE_ROLE_KEY)
    await logActivity({ req, actor_user_id: admin.id, customer_id: id, event_type: 'user', action: 'CUSTOMER_PASSWORD_RESET', metadata: { email: customer.email } })
    return ok({ new_password: newPassword }, 'Password berhasil direset')
  }

  if (userPlanPath && req.method === 'PUT') {
    const id = decodeURIComponent(userPlanPath[1])
    const customer = await getCustomerById(id)
    if (!customer) return fail('Akun pembeli tidak ditemukan', 404)
    const body = await req.json().catch(() => ({}))
    const plan = await getPlanByCode(body.plan_code)
    if (!plan) return fail('Paket tidak ditemukan', 404)
    const subscription = await createSubscription({
      customerId: id,
      plan,
      durationDays: body.duration_days,
      expiresAt: nullableText(body.expires_at ?? body.expired_at),
      source: 'manual',
      notes: nullableText(body.notes),
      replaceActive: true,
    })
    await logActivity({ req, actor_user_id: admin.id, customer_id: id, event_type: 'subscription', action: 'CUSTOMER_PLAN_CHANGED', metadata: { plan_code: plan.code, expires_at: subscription.expires_at } })
    return ok({ expired_at: subscription.expires_at, subscription }, 'Paket pembeli berhasil diubah')
  }

  if (req.method === 'GET' && pathname === '/admin/features') {
    await ensureDefaultFeatureCatalog()
    const features = await rest<any[]>('GET', 'feature_catalog?select=*&order=sort_order.asc')
    return ok(features.map(feature => ({ ...feature, is_active: toBoolean(feature.is_active) ? 1 : 0 })))
  }

  if (req.method === 'POST' && pathname === '/admin/features') {
    const body = await req.json().catch(() => ({}))
    const code = cleanText(body.code).toLowerCase()
    const name = cleanText(body.name)
    if (!/^[a-z0-9_]+$/.test(code)) return fail('Kode fitur harus snake_case')
    if (!name) return fail('Nama fitur wajib diisi')
    const rows = await rest<any[]>('POST', 'feature_catalog?select=*', {
      code,
      name,
      category: nullableText(body.category),
      description: nullableText(body.description),
      is_active: body.is_active === undefined ? true : toBoolean(body.is_active),
      sort_order: Math.trunc(toNumber(body.sort_order, 0)),
    }, 'return=representation')
    await logActivity({ req, actor_user_id: admin.id, event_type: 'feature', action: 'FEATURE_CREATED', metadata: { code } })
    return ok(rows[0], 'Fitur berhasil dibuat')
  }

  if (featurePath && req.method === 'PATCH') {
    const id = decodeURIComponent(featurePath[1])
    const body = await req.json().catch(() => ({}))
    const payload: Record<string, unknown> = {}
    if (body.name !== undefined) payload.name = cleanText(body.name)
    if (body.category !== undefined) payload.category = nullableText(body.category)
    if (body.description !== undefined) payload.description = nullableText(body.description)
    if (body.is_active !== undefined) payload.is_active = toBoolean(body.is_active)
    if (body.sort_order !== undefined) payload.sort_order = Math.trunc(toNumber(body.sort_order, 0))
    const rows = await rest<any[]>('PATCH',
      `feature_catalog?id=eq.${encodeURIComponent(id)}&select=*`,
      payload,
      'return=representation')
    if (!rows[0]) return fail('Fitur tidak ditemukan', 404)
    await logActivity({ req, actor_user_id: admin.id, event_type: 'feature', action: 'FEATURE_UPDATED', metadata: { feature_id: id, fields: Object.keys(payload) } })
    return ok(rows[0], 'Fitur berhasil diperbarui')
  }

  if (req.method === 'GET' && pathname === '/admin/payments') {
    const payments = await rest<any[]>('GET', 'payments?select=*,license_customers(id,name,email),subscription_plans(code,name)&order=created_at.desc')
    return ok(await Promise.all(payments.map(serializePayment)))
  }

  if (req.method === 'POST' && pathname === '/admin/payments') {
    const body = await req.json().catch(() => ({}))
    const customerId = cleanText(body.user_id ?? body.customer_id)
    const customer = await getCustomerById(customerId)
    if (!customer) return fail('Akun pembeli tidak ditemukan', 404)
    const plan = body.plan_code ? await getPlanByCode(body.plan_code) : null
    if (body.plan_code && !plan) return fail('Paket tidak ditemukan', 404)
    const statusInput = cleanText(body.status) || 'pending'
    const status = statusInput === 'success' ? 'paid' : statusInput
    if (!['pending', 'paid', 'failed', 'expired'].includes(status)) return fail('Status pembayaran tidak valid')
    const paymentRows = await rest<any[]>('POST', 'payments?select=*,license_customers(id,name,email),subscription_plans(code,name)', {
      customer_id: customer.id,
      plan_id: plan?.id ?? null,
      amount: toNumber(body.amount, 0),
      currency: cleanText(body.currency) || 'IDR',
      method: nullableText(body.method),
      status,
      provider: nullableText(body.provider) ?? 'manual',
      invoice_number: nullableText(body.invoice_number),
      external_ref: nullableText(body.external_ref),
      notes: nullableText(body.notes),
      paid_at: status === 'paid' ? new Date().toISOString() : null,
      approved_by: status === 'paid' ? admin.id : null,
    }, 'return=representation')
    let subscription = null
    if (status === 'paid' && plan) {
      subscription = await createSubscription({
        customerId: customer.id,
        plan,
        durationDays: body.duration_days,
        source: 'payment',
        notes: nullableText(body.notes),
      })
    }
    await logActivity({ req, actor_user_id: admin.id, customer_id: customer.id, event_type: 'payment', action: 'PAYMENT_CREATED', metadata: { status, plan_code: plan?.code ?? null } })
    return ok({ ...(await serializePayment(paymentRows[0])), subscription }, 'Pembayaran berhasil dicatat')
  }

  if (paymentApprovePath && req.method === 'POST') {
    const id = decodeURIComponent(paymentApprovePath[1])
    const existingRows = await rest<any[]>('GET',
      `payments?id=eq.${encodeURIComponent(id)}&select=*,license_customers(id,name,email),subscription_plans(*)&limit=1`
    )
    const payment = existingRows[0]
    if (!payment) return fail('Pembayaran tidak ditemukan', 404)
    const rows = await rest<any[]>('PATCH',
      `payments?id=eq.${encodeURIComponent(id)}&select=*,license_customers(id,name,email),subscription_plans(code,name)`,
      { status: 'paid', paid_at: new Date().toISOString(), approved_by: admin.id, updated_at: nowIso() },
      'return=representation')
    let subscription = null
    if (payment.customer_id && payment.plan_id && payment.subscription_plans) {
      subscription = await createSubscription({
        customerId: payment.customer_id,
        plan: payment.subscription_plans,
        source: 'payment',
        notes: payment.notes,
      })
    }
    await logActivity({ req, actor_user_id: admin.id, customer_id: payment.customer_id, event_type: 'payment', action: 'PAYMENT_APPROVED', metadata: { payment_id: id } })
    return ok({ ...(await serializePayment(rows[0])), subscription }, 'Pembayaran berhasil diapprove')
  }

  if (paymentPath && req.method === 'DELETE') {
    const id = decodeURIComponent(paymentPath[1])
    const rows = await rest<any[]>('GET',
      `payments?id=eq.${encodeURIComponent(id)}&select=*,license_customers(id,name,email),subscription_plans(code,name)&limit=1`
    )
    const payment = rows[0]
    if (!payment) return fail('Pembayaran tidak ditemukan', 404)

    await rest('DELETE', `payments?id=eq.${encodeURIComponent(id)}`, undefined, 'return=minimal')
    await logActivity({
      req,
      actor_user_id: admin.id,
      customer_id: payment.customer_id,
      event_type: 'payment',
      action: 'PAYMENT_DELETED',
      metadata: {
        payment_id: id,
        status: payment.status,
        plan_code: payment.subscription_plans?.code ?? null,
        paid: isPaymentPaid(String(payment.status)),
      },
    })
    return ok({ id }, 'Pembayaran berhasil dihapus')
  }

  if ((deviceRevokePath || deviceBlockPath) && req.method === 'POST') {
    const id = decodeURIComponent((deviceRevokePath ?? deviceBlockPath)![1])
    const row = await patchDeviceStatus(id, 'blocked', admin.id)
    if (!row) return fail('Device tidak ditemukan', 404)
    await logActivity({ req, actor_user_id: admin.id, customer_id: row.customer_id, event_type: 'device', action: 'DEVICE_BLOCKED', metadata: { device_id: id } })
    return ok(await serializeAppDevice(row), 'Device berhasil diblokir')
  }

  if (deviceUnblockPath && req.method === 'POST') {
    const id = decodeURIComponent(deviceUnblockPath[1])
    const row = await patchDeviceStatus(id, 'active', admin.id)
    if (!row) return fail('Device tidak ditemukan', 404)
    await logActivity({ req, actor_user_id: admin.id, customer_id: row.customer_id, event_type: 'device', action: 'DEVICE_UNBLOCKED', metadata: { device_id: id } })
    return ok(await serializeAppDevice(row), 'Device berhasil diaktifkan')
  }

  if ((deviceSuspendLicensePath || deviceActivateLicensePath || deviceExtendLicensePath) && req.method === 'POST') {
    const id = decodeURIComponent((deviceSuspendLicensePath ?? deviceActivateLicensePath ?? deviceExtendLicensePath)![1])
    const device = await getAppDeviceById(id)
    if (!device?.customer_id) return fail('Device pembeli tidak ditemukan', 404)
    const subscription = await getLatestSubscription(device.customer_id)
    if (!subscription) return fail('Subscription tidak ditemukan', 404)

    if (deviceSuspendLicensePath) {
      await rest('PATCH',
        `customer_subscriptions?id=eq.${encodeURIComponent(subscription.id)}`,
        { status: 'suspended', updated_at: nowIso() },
        'return=minimal')
      await rest('PATCH',
        `license_customers?id=eq.${encodeURIComponent(device.customer_id)}`,
        { status: 'suspended', updated_at: nowIso() },
        'return=minimal')
      await logActivity({ req, actor_user_id: admin.id, customer_id: device.customer_id, event_type: 'subscription', action: 'LICENSE_SUSPENDED', metadata: { device_id: id } })
      return ok({ id, status: 'suspended' }, 'Lisensi ditangguhkan')
    }

    if (deviceActivateLicensePath) {
      await rest('PATCH',
        `customer_subscriptions?id=eq.${encodeURIComponent(subscription.id)}`,
        { status: 'active', updated_at: nowIso() },
        'return=minimal')
      await rest('PATCH',
        `license_customers?id=eq.${encodeURIComponent(device.customer_id)}`,
        { status: 'active', updated_at: nowIso() },
        'return=minimal')
      await logActivity({ req, actor_user_id: admin.id, customer_id: device.customer_id, event_type: 'subscription', action: 'LICENSE_ACTIVATED', metadata: { device_id: id } })
      return ok({ id, status: 'active' }, 'Lisensi diaktifkan')
    }

    const body = await req.json().catch(() => ({}))
    const days = toPositiveInt(body.days, 30)
    const base = subscription.expires_at && new Date(subscription.expires_at).getTime() > Date.now()
      ? new Date(subscription.expires_at)
      : new Date()
    const expiresAt = new Date(base.getTime() + days * 86400000).toISOString()
    await rest('PATCH',
      `customer_subscriptions?id=eq.${encodeURIComponent(subscription.id)}`,
      { status: 'active', expires_at: expiresAt, updated_at: nowIso() },
      'return=minimal')
    await rest('PATCH',
      `license_customers?id=eq.${encodeURIComponent(device.customer_id)}`,
      { status: 'active', updated_at: nowIso() },
      'return=minimal')
    await logActivity({ req, actor_user_id: admin.id, customer_id: device.customer_id, event_type: 'subscription', action: 'LICENSE_EXTENDED', metadata: { device_id: id, days, expires_at: expiresAt } })
    return ok({ id, expired_at: expiresAt }, 'Lisensi diperpanjang')
  }

  await logActivity({
    req,
    actor_user_id: admin.id,
    event_type: 'error',
    action: 'ADMIN_ROUTE_NOT_FOUND',
    metadata: { pathname, method: req.method },
  })
  return fail('Endpoint admin belum tersedia', 404)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const pathname = url.pathname.replace(/^\/mediasoft-license/, '') || '/'

    if (req.method === 'GET' && (pathname === '/' || pathname === '/health')) {
      return ok({ time: new Date().toISOString(), provider: 'supabase' }, 'License server Supabase aktif')
    }

    if (req.method === 'POST' && pathname === '/auth/login') return await handleAdminLogin(req)
    if (req.method === 'POST' && pathname === '/auth/refresh') return await handleAdminRefresh(req)
    if (req.method === 'POST' && pathname === '/customer/login') return await handleCustomerLogin(req)
    if (req.method === 'POST' && pathname === '/register-trial') return await handleRegisterTrial(req)
    if (req.method === 'POST' && pathname === '/check-license') return await handleCheckLicense(req)
    if (req.method === 'POST' && pathname === '/sync') return await handleCheckLicense(req)
    if (req.method === 'POST' && pathname === '/validate-device') return await handleCheckLicense(req)
    if (req.method === 'POST' && pathname === '/heartbeat') return await handleHeartbeat(req)
    if ((req.method === 'GET' || req.method === 'POST') && pathname === '/app-update') return await handleAppUpdateCheck(req)
    if ((req.method === 'GET' || req.method === 'POST') && pathname === '/announcements') return await handlePublicAnnouncements(req)
    if (req.method === 'POST' && pathname === '/errors') return await handleReportError(req)
    if (req.method === 'GET' && pathname === '/active-features') return await handleActiveFeatures(req)
    if (req.method === 'GET' && pathname === '/plans') {
      return ok(buyerVisiblePlans(await listPlansRaw()).map(serializePlan))
    }
    if (req.method === 'POST' && pathname === '/payments/create') return await handleCreatePaymentInvoice(req)
    if (req.method === 'POST' && pathname === '/payments/manual-request') return await handleCreateManualPaymentRequest(req)
    if (req.method === 'GET' && pathname === '/payments/status') return await handlePaymentStatus(req)
    if (req.method === 'POST' && pathname === '/payments/midtrans/webhook') return await handleMidtransWebhook(req)

    if (req.method === 'GET' && pathname.startsWith('/popup/')) {
      const code = pathname.split('/').pop() ?? ''
      return ok(await getPopup(code))
    }

    if (pathname.startsWith('/admin/')) return await handleAdmin(req, pathname)

    return fail('Endpoint tidak ditemukan', 404)
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : String(error)
    const lower = message.toLowerCase()
    if (lower.includes('invalid jwt') || lower.includes('token is expired') || (lower.includes('jwt') && lower.includes('expired'))) {
      return fail('Session developer kedaluwarsa. Silakan login ulang atau refresh token.', 401, { error_code: 'SESSION_EXPIRED', detail: message })
    }
    return fail(message, 500)
  }
})
