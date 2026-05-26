// MediaSoft POS central license API for Supabase Edge Functions.
// Deploy with: supabase functions deploy mediasoft-license

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
  return await response.json() as T
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
    TRIAL: ['TRIAL_3_DAYS'],
    DEMO: ['TRIAL_3_DAYS'],
  }
  return [code, ...(aliases[code] ?? [])]
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

async function getTrialPlan() {
  const plans = await rest<any[]>('GET',
    'subscription_plans?code=eq.TRIAL_3_DAYS&select=*&limit=1'
  )
  const plan = plans[0]
  if (!plan) throw new Error('Paket Trial 3 Hari belum tersedia. Jalankan migration Supabase.')
  return plan
}

async function listPlansRaw() {
  return await rest<any[]>('GET', 'subscription_plans?select=*&order=sort_order.asc')
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
  const now = new Date().toISOString()
  const active = await rest<any[]>('GET',
    `customer_subscriptions?customer_id=eq.${encodeURIComponent(customerId)}&status=eq.active&expires_at=gte.${encodeURIComponent(now)}&select=*,subscription_plans(*)&order=expires_at.desc&limit=1`
  )
  if (active[0]) return active[0]

  const latest = await rest<any[]>('GET',
    `customer_subscriptions?customer_id=eq.${encodeURIComponent(customerId)}&select=*,subscription_plans(*)&order=expires_at.desc&limit=1`
  )
  return latest[0] ?? null
}

async function getLatestSubscription(customerId: string) {
  const rows = await rest<any[]>('GET',
    `customer_subscriptions?customer_id=eq.${encodeURIComponent(customerId)}&select=*,subscription_plans(*)&order=expires_at.desc&limit=1`
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

  if (existing?.status === 'revoked' || existing?.status === 'blocked') {
    return { allowed: false, reason: 'device_revoked', current, max, device: existing }
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
    customer,
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
    is_expired: !subscription || (expiresAt ? new Date(expiresAt).getTime() < Date.now() : true),
    device: deviceCheck ?? null,
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

  await logActivity({
    req,
    customer_id: customer.id,
    event_type: 'subscription',
    action: 'TRIAL_REGISTERED',
    metadata: { email, plan_code: trialPlan.code, expires_at: expiresAt, device_id: device.device_id ?? device.deviceId ?? null },
  })

  return ok(subscriptionPayload(customer, subscription, deviceCheck), 'Trial 3 hari aktif')
}

async function handleCheckLicense(req: Request) {
  const body = await req.json().catch(() => ({}))
  const customer = await getCustomer({
    customer_id: cleanText(body.customer_id),
    email: cleanText(body.email).toLowerCase(),
    auth_user_id: cleanText(body.auth_user_id),
  })
  if (!customer) return fail('Akun pembeli tidak ditemukan', 404)
  if (customer.status !== 'active') return fail('Akun pembeli tidak aktif', 403, { status: customer.status })

  const subscription = await getActiveSubscription(customer.id)
  if (!subscription || !subscription.subscription_plans) {
    return fail('Langganan tidak aktif atau sudah berakhir', 402, {
      ...subscriptionPayload(customer, subscription),
      popup: await getPopup('EXPIRED'),
    })
  }

  const deviceCheck = await validateDevice(customer.id, subscription.subscription_plans, body.device ?? body.deviceInfo ?? body)
  if (!deviceCheck.allowed) {
    return fail(
      deviceCheck.reason === 'device_limit' ? 'Batas device paket sudah tercapai' : 'Device sudah direvoke atau diblokir',
      403,
      { ...subscriptionPayload(customer, subscription, deviceCheck), popup: await getPopup('DEVICE_LIMIT') },
    )
  }

  await logActivity({
    req,
    customer_id: customer.id,
    event_type: 'license',
    action: 'LICENSE_CHECKED',
    metadata: { device_id: body.device_id ?? body.device?.device_id ?? null },
  })

  return ok(subscriptionPayload(customer, subscription, deviceCheck), 'Lisensi aktif')
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

  await logActivity({
    req,
    actor_user_id: auth.user.id,
    event_type: 'login',
    action: 'ADMIN_LOGIN',
    metadata: { email },
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
  if (customer.status !== 'active') return fail('Akun pembeli tidak aktif', 403, { status: customer.status })

  const subscription = await getActiveSubscription(customer.id)
  if (!subscription || !subscription.subscription_plans) {
    return fail('Langganan tidak aktif atau sudah berakhir', 402, {
      ...subscriptionPayload(customer, subscription),
      popup: await getPopup('EXPIRED'),
    })
  }

  const deviceCheck = await validateDevice(customer.id, subscription.subscription_plans, body.device ?? body.deviceInfo ?? body)
  if (!deviceCheck.allowed) {
    return fail(
      deviceCheck.reason === 'device_limit' ? 'Batas device paket sudah tercapai' : 'Device sudah direvoke atau diblokir',
      403,
      { ...subscriptionPayload(customer, subscription, deviceCheck), popup: await getPopup('DEVICE_LIMIT') },
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

async function serializeCustomer(customer: any) {
  const subscription = await getLatestSubscription(customer.id)
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
    status: payment.status,
    notes: payment.notes,
    paid_at: payment.paid_at,
    created_at: payment.created_at,
  }
}

async function createSubscription(input: {
  customerId: string
  plan: any
  durationDays?: number
  source: string
  notes?: string | null
  replaceActive?: boolean
}) {
  const durationDays = toPositiveInt(input.durationDays, Number(input.plan.duration_days ?? 30))
  const now = new Date()
  const expiresAt = new Date(now.getTime() + durationDays * 86400000).toISOString()

  if (input.replaceActive) {
    await rest('PATCH',
      `customer_subscriptions?customer_id=eq.${encodeURIComponent(input.customerId)}&status=eq.active`,
      { status: 'cancelled' },
      'return=minimal')
  }

  const rows = await rest<any[]>('POST', 'customer_subscriptions?select=*,subscription_plans(*)', {
    customer_id: input.customerId,
    plan_id: input.plan.id,
    status: 'active',
    started_at: now.toISOString(),
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
  if (!partial || body.duration_days !== undefined) assign('duration_days', toPositiveInt(body.duration_days, 30))
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

async function handleAdmin(req: Request, pathname: string) {
  const admin = await getAdminFromRequest(req)
  const userPath = pathname.match(/^\/admin\/users\/([^/]+)$/)
  const userPlanPath = pathname.match(/^\/admin\/users\/([^/]+)\/plan$/)
  const userResetPath = pathname.match(/^\/admin\/users\/([^/]+)\/reset-password$/)
  const planPath = pathname.match(/^\/admin\/plans\/([^/]+)$/)
  const planFeaturesPath = pathname.match(/^\/admin\/plans\/([^/]+)\/features$/)
  const featurePath = pathname.match(/^\/admin\/features\/([^/]+)$/)
  const popupPath = pathname.match(/^\/admin\/popups\/([^/]+)$/)
  const paymentApprovePath = pathname.match(/^\/admin\/payments\/([^/]+)\/approve$/)
  const deviceRevokePath = pathname.match(/^\/admin\/devices\/([^/]+)\/revoke$/)

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

  if (planFeaturesPath && req.method === 'GET') {
    const plan = await getPlanById(decodeURIComponent(planFeaturesPath[1]))
    if (!plan) return fail('Paket tidak ditemukan', 404)
    const features = await rest<any[]>('GET', 'feature_catalog?select=*&order=sort_order.asc')
    const flags = plan.feature_flags ?? {}
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
    const allowed = ['title', 'description', 'cta_text', 'cta_url', 'whatsapp_number', 'image_url', 'pricing_html', 'trigger_on']
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (body[key] !== undefined) payload[key] = key === 'trigger_on' ? body[key] : nullableText(body[key])
    }
    if (body.is_active !== undefined) payload.is_active = toBoolean(body.is_active)
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
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) payload.name = cleanText(body.name)
    if (body.phone !== undefined) payload.phone = nullableText(body.phone)
    if (body.status !== undefined) payload.status = cleanText(body.status) || 'active'
    const rows = await rest<any[]>('PATCH',
      `license_customers?id=eq.${encodeURIComponent(id)}&select=*`,
      payload,
      'return=representation')
    if (!rows[0]) return fail('Akun pembeli tidak ditemukan', 404)
    await logActivity({ req, actor_user_id: admin.id, customer_id: id, event_type: 'user', action: 'CUSTOMER_UPDATED', metadata: { fields: Object.keys(payload) } })
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
      source: 'manual',
      notes: nullableText(body.notes),
      replaceActive: true,
    })
    await logActivity({ req, actor_user_id: admin.id, customer_id: id, event_type: 'subscription', action: 'CUSTOMER_PLAN_CHANGED', metadata: { plan_code: plan.code, expires_at: subscription.expires_at } })
    return ok({ expired_at: subscription.expires_at, subscription }, 'Paket pembeli berhasil diubah')
  }

  if (req.method === 'GET' && pathname === '/admin/features') {
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
    const status = cleanText(body.status) || 'pending'
    const paymentRows = await rest<any[]>('POST', 'payments?select=*,license_customers(id,name,email),subscription_plans(code,name)', {
      customer_id: customer.id,
      plan_id: plan?.id ?? null,
      amount: toNumber(body.amount, 0),
      currency: cleanText(body.currency) || 'IDR',
      method: nullableText(body.method),
      status,
      notes: nullableText(body.notes),
      paid_at: status === 'success' ? new Date().toISOString() : null,
      approved_by: status === 'success' ? admin.id : null,
    }, 'return=representation')
    let subscription = null
    if (status === 'success' && plan) {
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
      { status: 'success', paid_at: new Date().toISOString(), approved_by: admin.id },
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

  if (deviceRevokePath && req.method === 'POST') {
    const id = decodeURIComponent(deviceRevokePath[1])
    const rows = await rest<any[]>('PATCH',
      `customer_devices?id=eq.${encodeURIComponent(id)}&select=*`,
      { status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: admin.id },
      'return=representation')
    if (!rows[0]) return fail('Device tidak ditemukan', 404)
    await logActivity({ req, actor_user_id: admin.id, customer_id: rows[0].customer_id, event_type: 'device', action: 'DEVICE_REVOKED', metadata: { device_id: id } })
    return ok(rows[0], 'Device berhasil direvoke')
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
    if (req.method === 'POST' && pathname === '/customer/login') return await handleCustomerLogin(req)
    if (req.method === 'POST' && pathname === '/register-trial') return await handleRegisterTrial(req)
    if (req.method === 'POST' && pathname === '/check-license') return await handleCheckLicense(req)
    if (req.method === 'POST' && pathname === '/validate-device') return await handleCheckLicense(req)
    if (req.method === 'GET' && pathname === '/active-features') return await handleActiveFeatures(req)

    if (req.method === 'GET' && pathname.startsWith('/popup/')) {
      const code = pathname.split('/').pop() ?? ''
      return ok(await getPopup(code))
    }

    if (pathname.startsWith('/admin/')) return await handleAdmin(req, pathname)

    return fail('Endpoint tidak ditemukan', 404)
  } catch (error) {
    console.error(error)
    return fail(error instanceof Error ? error.message : String(error), 500)
  }
})
