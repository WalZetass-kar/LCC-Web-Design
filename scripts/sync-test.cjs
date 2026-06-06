#!/usr/bin/env node

const DEFAULT_TIMEOUT_MS = Number(process.env.SYNC_TEST_TIMEOUT_MS || 12000)

function normalizeBaseUrl(raw) {
  const value = String(raw || '').trim().replace(/\/+$/, '')
  if (!value) return ''
  try {
    const url = new URL(value)
    const isLocalHttp =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname.startsWith('192.168.') ||
        url.hostname.startsWith('10.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname))
    if (url.protocol === 'https:' || isLocalHttp) return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
  return ''
}

async function fetchJson(url, init = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const data = await response.json().catch(() => null)
    return { response, data }
  } finally {
    clearTimeout(timeout)
  }
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.SYNC_SERVER_URL || process.env.ZETASS_POS_SYNC_SERVER_URL)
  const token = String(process.env.SYNC_SERVER_TOKEN || process.env.ZETASS_POS_SYNC_TOKEN || '').trim()

  if (!baseUrl) {
    console.log('[sync:test] Konfigurasi project siap.')
    console.log('[sync:test] Untuk test koneksi nyata, jalankan:')
    console.log('[sync:test] SYNC_SERVER_URL=http://127.0.0.1:38573 SYNC_SERVER_TOKEN=<token> npm run sync:test')
    return
  }

  const health = await fetchJson(`${baseUrl}/health`)
  if (!health.response.ok || !health.data?.success) {
    throw new Error(`Health check gagal: HTTP ${health.response.status}`)
  }
  console.log(`[sync:test] Health OK: ${baseUrl}`)

  if (!token) {
    console.log('[sync:test] Token tidak diisi; test berhenti setelah health check.')
    return
  }

  const invoke = await fetchJson(`${baseUrl}/api/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      channel: 'system:checkDb',
      args: [],
      device: {
        deviceId: 'sync-test-cli',
        deviceName: 'Sync Test CLI',
        userAgent: `sync-test/${process.version}`,
      },
    }),
  })

  if (!invoke.response.ok || !invoke.data?.success) {
    throw new Error(invoke.data?.message || `Invoke gagal: HTTP ${invoke.response.status}`)
  }

  console.log(`[sync:test] Invoke OK: ${invoke.data.message || 'system:checkDb berhasil'}`)
}

main().catch(error => {
  const message = error && error.name === 'AbortError'
    ? `Timeout setelah ${DEFAULT_TIMEOUT_MS} ms`
    : error?.message || String(error)
  console.error(`[sync:test] ${message}`)
  process.exit(1)
})
