#!/usr/bin/env node

const baseUrl = normalizeBaseUrl(process.env.ZETASS_POS_LICENSE_SERVER_URL || process.env.SUPABASE_LICENSE_SERVER_URL || '')
const adminEmail = process.env.LICENSE_ADMIN_EMAIL || ''
const adminPassword = process.env.LICENSE_ADMIN_PASSWORD || ''

if (!baseUrl) {
  console.error('ZETASS_POS_LICENSE_SERVER_URL wajib diisi.')
  process.exit(1)
}

const checks = []

async function main() {
  checks.push(await check('health', () => request('GET', '/health')))
  checks.push(await check('public plans', () => request('GET', '/plans')))

  if (adminEmail && adminPassword) {
    const login = await check('admin login', () => request('POST', '/auth/login', {
      email: adminEmail,
      password: adminPassword,
    }))
    checks.push(login)

    const token = login.data?.access_token
    if (token) {
      checks.push(await check('admin stats', () => request('GET', '/admin/stats', undefined, token)))
      checks.push(await check('admin devices', () => request('GET', '/admin/devices', undefined, token)))
    }
  } else {
    console.warn('Skip admin checks: LICENSE_ADMIN_EMAIL dan LICENSE_ADMIN_PASSWORD belum diisi.')
  }

  const failed = checks.filter(item => !item.ok)
  for (const item of checks) {
    console.log(`${item.ok ? 'OK' : 'FAIL'} ${item.name}${item.message ? ` - ${item.message}` : ''}`)
  }
  process.exit(failed.length ? 1 : 0)
}

async function check(name, fn) {
  try {
    const data = await fn()
    return { name, ok: !!data?.success, message: data?.message, data: data?.data }
  } catch (error) {
    return { name, ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}

async function request(method, path, body, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || `HTTP ${response.status}`)
  }
  return payload
}

function normalizeBaseUrl(raw) {
  const trimmed = String(raw).trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  try {
    const url = new URL(trimmed)
    if (url.hostname.endsWith('.supabase.co') && !url.pathname.includes('/functions/v1/')) {
      return `${url.origin}/functions/v1/mediasoft-license`
    }
  } catch {
    return trimmed
  }
  return trimmed
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
