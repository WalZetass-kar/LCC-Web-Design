import type {
  Barang,
  Customer,
  DashboardSummary,
  Identitas,
  IpcResponse,
  Kategori,
  KasDrawer,
  KasTransaksi,
  Penjualan,
  PenjualanDetailItem,
  Pengguna,
  Satuan,
  StrukSettings,
  Supplier,
  UserSession,
} from '../../shared/types'
import bcrypt from 'bcryptjs'
import { buildAssistantPrompt, buildLocalAssistantResponse } from '../../shared/dashboardAssistant'
import { dashboardSummaryToSheetsPayload, testGoogleSheetsPayload } from '../../shared/googleSheetsExport'
import { DEFAULT_INDUSTRY_SETTINGS, defaultModelForProvider, normalizeIndustrySettings, type IndustrySettings } from '../../shared/industrySettings'
import { validatePasswordStrength } from '../../shared/passwordPolicy'
import { normalizeSyncServerUrl } from '../../shared/endpointSecurity'
import { collectAuthDeviceInfo } from './authDevice'
import { secureStorage } from './secureStorage'
import { getPersistentItem, setPersistentItem } from './sqlitePersistence'

type AnyRecord = Record<string, any>
type MobileUser = Pengguna & {
  password?: string
  password_hash?: string
  password_hash_type?: 'bcrypt'
  pin_hash?: string | null
  pin_enabled?: number | boolean | null
  must_change_password?: number | boolean | null
  permissions?: Record<string, boolean>
}

interface MobileAuthDeviceInfo {
  deviceId?: string | null
  deviceName?: string | null
  userAgent?: string | null
}

interface MobileStore {
  version: number
  syncClient: {
    enabled: boolean
    baseUrl: string
    token: string
    lastConnectedAt: string | null
    lastError: string | null
    lastChannel: string | null
    syncCount: number
  }
  industrySettings: IndustrySettings
  identitas: Identitas
  strukSettings: StrukSettings
  users: MobileUser[]
  kategori: Kategori[]
  satuan: Satuan[]
  barang: Barang[]
  customers: Customer[]
  suppliers: Supplier[]
  penjualan: Penjualan[]
  penjualanDetails: Record<string, PenjualanDetailItem[]>
  kasDrawers: KasDrawer[]
  kasTransactions: KasTransaksi[]
  notifications: AnyRecord[]
  activityLogs: AnyRecord[]
  backups: AnyRecord[]
  paymentMethods: AnyRecord[]
  taxes: AnyRecord[]
  returns: AnyRecord[]
  shifts: AnyRecord[]
  debts: AnyRecord[]
  debtPayments: Record<string, AnyRecord[]>
  stockOpnames: AnyRecord[]
  stockOpnameItems: Record<string, AnyRecord[]>
  productImages: AnyRecord[]
  plans: AnyRecord[]
  tutorials: AnyRecord[]
  hppHistory: AnyRecord[]
  currencies: AnyRecord[]
  warehouses: AnyRecord[]
  batches: Record<string, AnyRecord[]>
  serials: Record<string, AnyRecord[]>
  promos: AnyRecord[]
  branches: AnyRecord[]
  loyaltyTiers: AnyRecord[]
  audit: AnyRecord[]
  whatsapp: AnyRecord
  security: AnyRecord
  ecommerce: AnyRecord
  counters: Record<string, number>
}

const STORAGE_KEY = 'mediasoft-pos-android-store-v3'
const STORE_VERSION = 3

let memoryStore: MobileStore | null = null

interface MobileLoginAttempt {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

const mobileLoginAttempts = new Map<string, MobileLoginAttempt>()
const MAX_LOGIN_ATTEMPTS = 5
const LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000
const LOGIN_WINDOW_MS = 5 * 60 * 1000

function now() {
  return new Date().toISOString()
}

function dateKey(value = new Date()) {
  return value.toISOString().slice(0, 10)
}

function compactDateKey() {
  return dateKey().split('-').join('')
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function ok<T>(data?: T, message = 'OK'): IpcResponse<T> {
  return { success: true, data, message }
}

function fail<T>(message: string): IpcResponse<T> {
  return { success: false, message }
}

function authDevice(value: unknown): MobileAuthDeviceInfo {
  const raw = (value ?? {}) as AnyRecord
  return {
    deviceId: typeof raw.deviceId === 'string' ? raw.deviceId : null,
    deviceName: typeof raw.deviceName === 'string' ? raw.deviceName : null,
    userAgent: typeof raw.userAgent === 'string' ? raw.userAgent : null,
  }
}

function deviceDetail(device: MobileAuthDeviceInfo): string {
  return [
    device.deviceName ? `device=${device.deviceName}` : null,
    device.deviceId ? `device_id=${device.deviceId}` : null,
    device.userAgent ? `ua=${device.userAgent.slice(0, 160)}` : null,
  ].filter(Boolean).join('; ') || 'device=android'
}

function loginLockStatus(key: string): { locked: boolean; remainingSeconds?: number } {
  const attempt = mobileLoginAttempts.get(key)
  if (!attempt?.lockedUntil) return { locked: false }
  const nowTime = Date.now()
  if (attempt.lockedUntil > nowTime) {
    return { locked: true, remainingSeconds: Math.ceil((attempt.lockedUntil - nowTime) / 1000) }
  }
  mobileLoginAttempts.delete(key)
  return { locked: false }
}

function recordFailedLoginAttempt(key: string) {
  const nowTime = Date.now()
  const attempt = mobileLoginAttempts.get(key)
  if (!attempt || nowTime - attempt.firstAttempt > LOGIN_WINDOW_MS) {
    mobileLoginAttempts.set(key, { count: 1, firstAttempt: nowTime })
    return { locked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS - 1 }
  }

  attempt.count += 1
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockedUntil = nowTime + LOGIN_LOCK_DURATION_MS
    mobileLoginAttempts.set(key, attempt)
    return { locked: true, remainingAttempts: 0 }
  }

  mobileLoginAttempts.set(key, attempt)
  return { locked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS - attempt.count }
}

function clearLoginAttempts(key: string) {
  mobileLoginAttempts.delete(key)
}

function auditAuth(store: MobileStore, username: string, aktivitas: string, detail: string, device: MobileAuthDeviceInfo) {
  store.activityLogs.unshift({
    kd_log: nextCounter(store, 'activity'),
    username,
    aktivitas,
    modul: 'AUTH',
    tgl_aktivitas: now(),
    ip_address: null,
    device_id: device.deviceId ?? null,
    user_agent: device.userAgent ?? null,
    detail: `${detail}. ${deviceDetail(device)}`,
  })
}

function defaultIdentitas(): Identitas {
  return {
    kode: 1,
    namatoko: 'MediaSoft POS Zetass',
    alamattoko: 'Android Offline',
    nomortelptoko: '-',
    nomorwaowner: '-',
    alamatemailowner: '-',
    logo: null,
    npwp: null,
    pajak_persen: 0,
    auto_barcode: 1,
    barcode_prefix: 'ZTS',
    auto_print: 0,
    struk_footer: 'Terima kasih atas kunjungan Anda',
    auto_backup: 0,
    backup_retention: 30,
    notif_stok: 1,
    min_stok: 5,
  }
}

function defaultStrukSettings(): StrukSettings {
  return {
    id: 1,
    printer_type: 'thermal',
    paper_size: '58mm',
    layout_type: 'classic',
    show_logo: 1,
    show_alamat: 1,
    show_telepon: 1,
    show_email: 0,
    show_kasir: 1,
    show_customer: 1,
    footer_text: 'Terima kasih atas kunjungan Anda',
    qris_image: null,
    qris_enabled: 0,
    updated_at: now(),
  }
}

function createDefaultStore(): MobileStore {
  const identitas = defaultIdentitas()

  return {
    version: STORE_VERSION,
    syncClient: {
      enabled: false,
      baseUrl: '',
      token: '',
      lastConnectedAt: null,
      lastError: null,
      lastChannel: null,
      syncCount: 0,
    },
    industrySettings: DEFAULT_INDUSTRY_SETTINGS,
    identitas,
    strukSettings: defaultStrukSettings(),
    users: [],
    kategori: [
      { kd_kategori_barang: 1, kategori_barang: 'Minuman', jumlah_produk: 0 },
      { kd_kategori_barang: 2, kategori_barang: 'Makanan', jumlah_produk: 0 },
      { kd_kategori_barang: 3, kategori_barang: 'Lainnya', jumlah_produk: 0 },
    ],
    satuan: [
      { kd_satuan: 1, nama_satuan: 'Pcs' },
      { kd_satuan: 2, nama_satuan: 'Box' },
      { kd_satuan: 3, nama_satuan: 'Botol' },
    ],
    barang: [
      {
        kd_barang: 'BRG001',
        nama_barang: 'Kopi Gula Aren',
        stok: 25,
        stok_minimum: 5,
        foto_barang: null,
        deskripsi_barang: 'Produk contoh Android',
        kd_kategori_barang: 1,
        kd_satuan: 3,
        jenis_transaksi: 'INCOME',
        harga_barang: 18000,
        potongan: 0,
        harga_modal: 10000,
        kategori_barang: 'Minuman',
        barcode: '899001',
        expired_date: null,
      },
      {
        kd_barang: 'BRG002',
        nama_barang: 'Teh Lemon',
        stok: 30,
        stok_minimum: 5,
        foto_barang: null,
        deskripsi_barang: 'Produk contoh Android',
        kd_kategori_barang: 1,
        kd_satuan: 3,
        jenis_transaksi: 'INCOME',
        harga_barang: 12000,
        potongan: 0,
        harga_modal: 6000,
        kategori_barang: 'Minuman',
        barcode: '899002',
        expired_date: null,
      },
      {
        kd_barang: 'BRG003',
        nama_barang: 'Roti Coklat',
        stok: 18,
        stok_minimum: 5,
        foto_barang: null,
        deskripsi_barang: 'Produk contoh Android',
        kd_kategori_barang: 2,
        kd_satuan: 1,
        jenis_transaksi: 'INCOME',
        harga_barang: 10000,
        potongan: 0,
        harga_modal: 5000,
        kategori_barang: 'Makanan',
        barcode: '899003',
        expired_date: null,
      },
    ],
    customers: [
      {
        kd_customer: 'CUS001',
        nama_customer: 'Pelanggan Umum',
        no_telp: null,
        email: null,
        alamat: null,
        tgl_lahir: null,
        poin: 0,
        total_belanja: 0,
        tgl_daftar: now(),
        status: 'Aktif',
      },
    ],
    suppliers: [
      {
        kd_suplier: 'SUP001',
        nama_suplier: 'Supplier Umum',
        alamat_suplier: null,
        no_telp_hp: null,
        email: null,
        status: 'Aktif',
        tgl_wkt_simpan: now(),
        tgl_wkt_edit: null,
      },
    ],
    penjualan: [],
    penjualanDetails: {},
    kasDrawers: [],
    kasTransactions: [],
    notifications: [],
    activityLogs: [],
    backups: [],
    paymentMethods: [
      { id: 1, name: 'Tunai', type: 'CASH', account_number: null, account_name: null, is_active: 1 },
      { id: 2, name: 'Transfer', type: 'BANK', account_number: null, account_name: null, is_active: 1 },
    ],
    taxes: [{ id: 1, name: 'PPN 0%', rate: 0, is_active: 1 }],
    returns: [],
    shifts: [],
    debts: [],
    debtPayments: {},
    stockOpnames: [],
    stockOpnameItems: {},
    productImages: [],
    plans: [
      { id: 1, name: 'Android Offline', price: 0, duration_days: 30, features: ['POS offline Android'], is_active: true, is_recommended: true, created_at: now(), updated_at: null },
    ],
    tutorials: [
      { id: 1, title: 'Mulai transaksi Android', content: 'Buka menu Produk untuk mengubah data, lalu gunakan menu Transaksi.', created_at: now() },
    ],
    hppHistory: [],
    currencies: [{ id: 1, code: 'IDR', name: 'Rupiah', symbol: 'Rp', is_default: 1, is_active: 1 }],
    warehouses: [{ id: 1, name: 'Gudang Utama', location: 'Android Offline', is_active: 1, created_at: now() }],
    batches: {},
    serials: {},
    promos: [],
    branches: [{ id: 1, name: 'Outlet Utama', address: 'Android Offline', is_active: 1, created_at: now() }],
    loyaltyTiers: [
      { id: 1, name: 'Regular', min_points: 0, discount_percent: 0, benefits: 'Member standar', color: '#64748b' },
      { id: 2, name: 'Gold', min_points: 100, discount_percent: 5, benefits: 'Diskon 5%', color: '#f59e0b' },
    ],
    audit: [],
    whatsapp: { enabled: 0, phone_number: '', message_template: '' },
    security: { id: 1, pin_enabled: 0, pin_code: '', lock_after_minutes: 15 },
    ecommerce: { enabled: 0, api_key: '', base_url: '' },
    counters: {
      barang: 4,
      customer: 2,
      supplier: 2,
      transaksi: 1,
      detail: 1,
      kategori: 4,
      satuan: 4,
      kas: 1,
      kasTransaksi: 1,
      notification: 1,
      activity: 1,
      backup: 1,
      payment: 3,
      tax: 2,
      return: 1,
      shift: 1,
      debt: 1,
      opname: 1,
      productImage: 1,
      plan: 2,
      tutorial: 2,
      hpp: 1,
      currency: 2,
      warehouse: 2,
      promo: 1,
      branch: 2,
      loyaltyTier: 3,
      audit: 1,
      barcode: 4,
    },
  }
}

function normalizeStore(value: Partial<MobileStore> | null): MobileStore {
  const base = createDefaultStore()
  if (!value || typeof value !== 'object') return base

  return {
    ...base,
    ...value,
    version: STORE_VERSION,
    syncClient: { ...base.syncClient, ...(value.syncClient ?? {}) },
    industrySettings: normalizeIndustrySettings(value.industrySettings ?? DEFAULT_INDUSTRY_SETTINGS),
    identitas: { ...base.identitas, ...(value.identitas ?? {}) },
    strukSettings: { ...base.strukSettings, ...(value.strukSettings ?? {}) },
    settings: undefined,
    counters: { ...base.counters, ...(value.counters ?? {}) },
    penjualanDetails: value.penjualanDetails ?? base.penjualanDetails,
    debtPayments: value.debtPayments ?? base.debtPayments,
    stockOpnameItems: value.stockOpnameItems ?? base.stockOpnameItems,
    batches: value.batches ?? base.batches,
    serials: value.serials ?? base.serials,
  } as MobileStore
}

function readStore(): MobileStore {
  if (memoryStore) return memoryStore

  try {
    const raw = secureStorage.getItem(STORAGE_KEY)
    memoryStore = normalizeStore(raw ? JSON.parse(raw) : null)
  } catch {
    memoryStore = createDefaultStore()
  }

  saveStore(memoryStore)
  return memoryStore
}

async function readStoreAsync(): Promise<MobileStore> {
  if (memoryStore) return memoryStore

  try {
    const raw = await getPersistentItem(STORAGE_KEY)
    memoryStore = normalizeStore(raw ? JSON.parse(raw) : null)
  } catch {
    memoryStore = readStore()
  }

  saveStore(memoryStore)
  return memoryStore
}

function saveStore(store: MobileStore) {
  memoryStore = store
  try {
    secureStorage.setJSON(STORAGE_KEY, store)
    void setPersistentItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Keep the in-memory store if WebView storage is full.
  }
}

async function hashMobilePassword(password: string) {
  return bcrypt.hash(password, 12)
}

async function verifyMobilePassword(password: string, user: MobileUser) {
  if (!user.password_hash) return false
  return bcrypt.compare(password, user.password_hash)
}

function createMobileSession(user: MobileUser, device: MobileAuthDeviceInfo): UserSession {
  const tokenBytes = new Uint8Array(32)
  crypto.getRandomValues(tokenBytes)
  const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('')
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()

  return {
    ...toSession(user),
    session_token: token,
    session_expires_at: expiresAt,
    device_id: device.deviceId ?? null,
  }
}

async function migrateMobileUserPasswords(store: MobileStore) {
  let changed = false

  for (const user of store.users) {
    if (user.password && !user.password_hash) {
      user.password_hash = await hashMobilePassword(user.password)
      user.password_hash_type = 'bcrypt'
      user.password = undefined
      user.must_change_password = user.must_change_password ?? 1
      changed = true
    }
  }

  if (changed) saveStore(store)
}

async function writeAndroidBackupFile(fileName: string, store: MobileStore) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const data = JSON.stringify({ exportedAt: now(), version: STORE_VERSION, store })
  await Filesystem.writeFile({
    path: `mediasoft-pos/${fileName}`,
    data,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  })
  return { path: `Documents/mediasoft-pos/${fileName}`, size: data.length }
}

async function readAndroidBackupFile(fileName: string) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  const result = await Filesystem.readFile({
    path: `mediasoft-pos/${fileName}`,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  })
  return JSON.parse(String(result.data)) as { store?: MobileStore }
}

function nextCounter(store: MobileStore, key: string) {
  const next = store.counters[key] ?? 1
  store.counters[key] = next + 1
  return next
}

function pad(value: number, length = 3) {
  return String(value).padStart(length, '0')
}

function publicUser(user: MobileStore['users'][number]): Pengguna {
  const {
    password: _password,
    password_hash: _passwordHash,
    password_hash_type: _passwordHashType,
    pin_hash: _pinHash,
    permissions: _permissions,
    ...safeUser
  } = user
  return safeUser
}

function accessDaysRemaining(expiresAt?: string | null): number | null {
  if (!expiresAt) return null
  const time = new Date(expiresAt).getTime()
  if (!Number.isFinite(time)) return null
  return Math.max(0, Math.ceil((time - Date.now()) / 86400000))
}

function toSession(user: MobileStore['users'][number]): UserSession {
  const expiresAt = user.subscription_expires_at ?? user.access_expires_at ?? null
  return {
    nama_pengguna: user.nama_pengguna,
    nama_lengkap: user.nama_lengkap,
    hak_akses: user.hak_akses,
    access_expires_at: expiresAt,
    access_days_remaining: accessDaysRemaining(expiresAt),
    must_change_password: !!user.must_change_password,
    subscription_plan_id: user.subscription_plan_id ?? null,
    subscription_expires_at: user.subscription_expires_at ?? null,
  }
}

function kategoriName(store: MobileStore, id?: number | null) {
  return store.kategori.find(item => item.kd_kategori_barang === id)?.kategori_barang ?? null
}

function decorateBarang(store: MobileStore, barang: Barang): Barang {
  return {
    ...barang,
    stok: toNumber(barang.stok),
    stok_minimum: toNumber(barang.stok_minimum, toNumber(store.identitas.min_stok, 5)),
    harga_barang: toNumber(barang.harga_barang),
    harga_modal: toNumber(barang.harga_modal),
    potongan: toNumber(barang.potongan),
    jenis_transaksi: barang.jenis_transaksi ?? 'INCOME',
    kategori_barang: kategoriName(store, barang.kd_kategori_barang) ?? barang.kategori_barang ?? '-',
  }
}

function getBarangList(store: MobileStore) {
  return store.barang.map(item => decorateBarang(store, item))
}

function getKategoriList(store: MobileStore) {
  return store.kategori.map(item => ({
    ...item,
    jumlah_produk: store.barang.filter(barang => barang.kd_kategori_barang === item.kd_kategori_barang).length,
  }))
}

function rangeFilter<T extends { tgl_wkt_transaksi?: string | null; tgl_pembelian?: string | null; created_at?: string | null }>(
  rows: T[],
  start?: string,
  end?: string,
) {
  const startKey = start || '0000-00-00'
  const endKey = end || '9999-99-99'
  return rows.filter(row => {
    const key = (row.tgl_wkt_transaksi ?? row.tgl_pembelian ?? row.created_at ?? '').slice(0, 10)
    return key >= startKey && key <= endKey
  })
}

function saleTotal(details: PenjualanDetailItem[], pajak = 0, discount = 0) {
  const subtotal = details.reduce((sum, item) => sum + toNumber(item.total_harga_jual), 0)
  return subtotal + toNumber(pajak) - toNumber(discount)
}

function dashboardSummary(store: MobileStore): DashboardSummary {
  const today = dateKey()
  const nowDate = new Date()
  const weekStart = new Date(nowDate)
  weekStart.setDate(nowDate.getDate() - 6)
  const monthKey = today.slice(0, 7)

  const todaySales = store.penjualan.filter(item => (item.tgl_wkt_transaksi ?? '').slice(0, 10) === today)
  const weekSales = store.penjualan.filter(item => (item.tgl_wkt_transaksi ?? '').slice(0, 10) >= dateKey(weekStart))
  const monthSales = store.penjualan.filter(item => (item.tgl_wkt_transaksi ?? '').slice(0, 7) === monthKey)

  const total = (rows: Penjualan[]) => rows.reduce((sum, item) => sum + toNumber(item.sub_total), 0)

  const chartData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(nowDate)
    date.setDate(nowDate.getDate() - (6 - index))
    const key = dateKey(date)
    const label = date.toLocaleDateString('id-ID', { weekday: 'short' })
    return {
      label,
      total: total(store.penjualan.filter(item => (item.tgl_wkt_transaksi ?? '').slice(0, 10) === key)),
    }
  })

  const productMap = new Map<string, { kd_barang: string; nama_barang: string | null; total_qty: number; total_revenue: number }>()
  for (const detailRows of Object.values(store.penjualanDetails)) {
    for (const detail of detailRows) {
      const kd = detail.kd_barang ?? ''
      const current = productMap.get(kd) ?? { kd_barang: kd, nama_barang: detail.nama_barang, total_qty: 0, total_revenue: 0 }
      current.total_qty += toNumber(detail.qty)
      current.total_revenue += toNumber(detail.total_harga_jual)
      productMap.set(kd, current)
    }
  }

  const lowStockProducts = getBarangList(store)
    .filter(item => toNumber(item.stok) <= toNumber(item.stok_minimum, 5))
    .map(item => ({
      kd_barang: item.kd_barang,
      nama_barang: item.nama_barang,
      stok: item.stok,
      stok_minimum: item.stok_minimum,
    }))

  return {
    today: { count: todaySales.length, total: total(todaySales) },
    week: { count: weekSales.length, total: total(weekSales) },
    month: { count: monthSales.length, total: total(monthSales) },
    totalBarang: store.barang.length,
    lowStockCount: lowStockProducts.length,
    chartData,
    predictedTomorrow: Math.round(chartData.reduce((sum, item) => sum + item.total, 0) / 7),
    topProducts: [...productMap.values()].sort((a, b) => b.total_qty - a.total_qty).slice(0, 5),
    lowStockProducts,
  }
}

function createSale(store: MobileStore, payload: AnyRecord) {
  const items = Array.isArray(payload.items) ? payload.items : []
  if (items.length === 0) return fail('Keranjang kosong')

  const kd = `TRX-${compactDateKey()}-${pad(nextCounter(store, 'transaksi'), 4)}`
  const details: PenjualanDetailItem[] = items.map((item: AnyRecord) => {
    const qty = toNumber(item.qty, 1)
    const price = toNumber(item.harga_jual)
    const disc = toNumber(item.disc)
    const discount = (price * disc) / 100
    return {
      kd_trans_jual_detail: nextCounter(store, 'detail'),
      kd_barang: String(item.kd_barang ?? ''),
      nama_barang: String(item.nama_barang ?? ''),
      harga_jual: price,
      qty,
      disc,
      total_harga_jual: (price - discount) * qty,
    }
  })

  const totalQty = details.reduce((sum, item) => sum + toNumber(item.qty), 0)
  const total = saleTotal(details, payload.pajak, payload.diskon_promo)
  const paid = toNumber(payload.yang_dibayar, total)

  const header: Penjualan = {
    kd_tansaksi_jual: kd,
    tgl_wkt_transaksi: now(),
    username_transaksi: String(payload.username ?? 'admin'),
    total_qty: totalQty,
    sub_total: total,
    discount_amount: toNumber(payload.diskon_promo),
    pajak: toNumber(payload.pajak),
    yang_dibayar: paid,
    kembalian: paid - total,
    jenis_pembayaran: String(payload.jenis_pembayaran ?? 'TUNAI'),
    shift_id: payload.shift_id ? toNumber(payload.shift_id) : null,
    kd_customer: payload.kd_customer ? String(payload.kd_customer) : null,
  }

  for (const detail of details) {
    const product = store.barang.find(item => item.kd_barang === detail.kd_barang)
    if (product) product.stok = Math.max(0, toNumber(product.stok) - toNumber(detail.qty))
  }

  if (header.kd_customer) {
    const customer = store.customers.find(item => item.kd_customer === header.kd_customer)
    if (customer) {
      customer.total_belanja = toNumber(customer.total_belanja) + total
      customer.poin = toNumber(customer.poin) + Math.floor(total / 10000)
    }
  }

  const activeKas = store.kasDrawers.find(item => item.status === 'OPEN' && item.username === header.username_transaksi)
  if (activeKas) {
    activeKas.total_penjualan = toNumber(activeKas.total_penjualan) + total
  }

  const activeShift = store.shifts.find(item => item.status === 'OPEN' && String(item.user_id) === String(header.username_transaksi))
  if (activeShift) {
    activeShift.total_sales = toNumber(activeShift.total_sales) + total
    activeShift.total_transactions = toNumber(activeShift.total_transactions) + 1
  }

  store.penjualan.unshift(header)
  store.penjualanDetails[kd] = details
  saveStore(store)

  return { success: true, message: 'Transaksi berhasil disimpan', data: { kd_transaksi: kd }, kd_transaksi: kd } as IpcResponse<{ kd_transaksi: string }>
}

function addKasTransaction(store: MobileStore, kdKas: string, jenis: 'MASUK' | 'KELUAR', jumlah: number, keterangan: string, username?: string) {
  const drawer = store.kasDrawers.find(item => item.kd_kas === kdKas)
  if (!drawer) return fail('Kas tidak ditemukan')

  const row: KasTransaksi = {
    kd_kas_transaksi: nextCounter(store, 'kasTransaksi'),
    kd_kas: kdKas,
    jenis,
    jumlah,
    keterangan,
    tgl_transaksi: now(),
    username: username ?? drawer.username,
  }

  store.kasTransactions.unshift(row)
  if (jenis === 'MASUK') drawer.total_pemasukan = toNumber(drawer.total_pemasukan) + jumlah
  else drawer.total_pengeluaran = toNumber(drawer.total_pengeluaran) + jumlah
  saveStore(store)
  return ok(row, 'Transaksi kas disimpan')
}

function createSimpleRow(store: MobileStore, rows: AnyRecord[], counter: string, data: AnyRecord, idKey = 'id') {
  const row = { ...data, [idKey]: data[idKey] ?? nextCounter(store, counter), created_at: data.created_at ?? now() }
  rows.unshift(row)
  saveStore(store)
  return ok(row, 'Data berhasil disimpan')
}

function updateSimpleRow(store: MobileStore, rows: AnyRecord[], id: unknown, data: AnyRecord, idKey = 'id') {
  const index = rows.findIndex(row => String(row[idKey]) === String(id))
  if (index < 0) return fail('Data tidak ditemukan')
  rows[index] = { ...rows[index], ...data, updated_at: now() }
  saveStore(store)
  return ok(rows[index], 'Data berhasil diperbarui')
}

function deleteSimpleRow(store: MobileStore, rows: AnyRecord[], id: unknown, idKey = 'id') {
  const next = rows.filter(row => String(row[idKey]) !== String(id))
  if (next.length === rows.length) return fail('Data tidak ditemukan')
  rows.splice(0, rows.length, ...next)
  saveStore(store)
  return ok(undefined, 'Data berhasil dihapus')
}

function laporanPenjualan(store: MobileStore, start?: string, end?: string) {
  const transaksi = rangeFilter(store.penjualan, start, end)
  return {
    transaksi,
    summary: {
      total_transaksi: transaksi.length,
      total_qty: transaksi.reduce((sum, item) => sum + toNumber(item.total_qty), 0),
      total_penjualan: transaksi.reduce((sum, item) => sum + toNumber(item.sub_total), 0),
      total_pajak: transaksi.reduce((sum, item) => sum + toNumber(item.pajak), 0),
    },
  }
}

function laporanLabaRugi(store: MobileStore, start?: string, end?: string) {
  const transaksi = rangeFilter(store.penjualan, start, end)
  let totalModal = 0
  for (const sale of transaksi) {
    const details = store.penjualanDetails[sale.kd_tansaksi_jual] ?? []
    totalModal += details.reduce((sum, detail) => {
      const product = store.barang.find(item => item.kd_barang === detail.kd_barang)
      return sum + toNumber(product?.harga_modal) * toNumber(detail.qty)
    }, 0)
  }
  const totalPenjualan = transaksi.reduce((sum, item) => sum + toNumber(item.sub_total), 0)
  const laba = totalPenjualan - totalModal
  return {
    total_transaksi: transaksi.length,
    total_penjualan: totalPenjualan,
    total_modal: totalModal,
    laba_kotor: laba,
    margin_persen: totalPenjualan > 0 ? Math.round((laba / totalPenjualan) * 10000) / 100 : 0,
  }
}

function produkTerlaris(store: MobileStore, start?: string, end?: string, limit = 10) {
  const transaksi = rangeFilter(store.penjualan, start, end)
  const sales = new Set(transaksi.map(item => item.kd_tansaksi_jual))
  const map = new Map<string, AnyRecord>()
  for (const [kd, details] of Object.entries(store.penjualanDetails)) {
    if (!sales.has(kd)) continue
    for (const detail of details) {
      const productId = detail.kd_barang ?? ''
      const current = map.get(productId) ?? { kd_barang: productId, nama_barang: detail.nama_barang ?? productId, total_qty: 0, total_penjualan: 0 }
      current.total_qty += toNumber(detail.qty)
      current.total_penjualan += toNumber(detail.total_harga_jual)
      map.set(productId, current)
    }
  }
  return [...map.values()].sort((a, b) => b.total_qty - a.total_qty).slice(0, limit)
}

function validatePromo(store: MobileStore, code: string, subtotal: number) {
  const promo = store.promos.find(item => String(item.code).toUpperCase() === code.toUpperCase() && item.is_active === 1)
  if (!promo) return ok({ valid: false, message: 'Kode promo tidak ditemukan' })
  if (toNumber(subtotal) < toNumber(promo.min_purchase)) return ok({ valid: false, message: 'Minimum pembelian belum terpenuhi' })
  if (promo.usage_limit && toNumber(promo.usage_count) >= toNumber(promo.usage_limit)) return ok({ valid: false, message: 'Kuota promo habis' })

  const rawDiscount = promo.type === 'PERCENTAGE'
    ? toNumber(subtotal) * toNumber(promo.value) / 100
    : toNumber(promo.value)
  const discount = promo.max_discount ? Math.min(rawDiscount, toNumber(promo.max_discount)) : rawDiscount
  return ok({ valid: true, promo, discount: Math.round(discount) })
}

function normalizeBaseUrl(value: string) {
  const result = normalizeSyncServerUrl(value)
  return result.valid ? result.url ?? '' : ''
}

function shouldUseRemote(store: MobileStore, channel: string) {
  return (
    store.syncClient.enabled &&
    Boolean(store.syncClient.baseUrl && store.syncClient.token) &&
    !channel.startsWith('sync:') &&
    channel !== 'print:execute'
  )
}

async function remoteInvoke<T>(store: MobileStore, channel: string, args: unknown[]): Promise<IpcResponse<T>> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10000)

  try {
    const baseUrl = normalizeBaseUrl(store.syncClient.baseUrl)
    if (!baseUrl) return fail('Alamat server sinkronisasi harus HTTPS atau HTTP LAN')

    const response = await fetch(`${baseUrl}/api/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: store.syncClient.token,
        channel,
        args,
        device: collectAuthDeviceInfo(),
      }),
      signal: controller.signal,
    })

    const result = await response.json().catch(() => null) as IpcResponse<T> | null
    if (!response.ok || !result) {
      store.syncClient.lastError = `HTTP ${response.status}`
      store.syncClient.lastChannel = channel
      saveStore(store)
      return fail(`Sinkronisasi gagal (${response.status}). Periksa alamat desktop dan token.`)
    }

    store.syncClient.lastConnectedAt = now()
    store.syncClient.lastError = result.success ? null : result.message ?? 'Channel gagal'
    store.syncClient.lastChannel = channel
    store.syncClient.syncCount += 1
    saveStore(store)
    return result
  } catch (error) {
    store.syncClient.lastError = error instanceof Error ? error.message : 'Koneksi sync gagal'
    store.syncClient.lastChannel = channel
    saveStore(store)
    return fail(
      error instanceof Error && error.name === 'AbortError'
        ? 'Koneksi ke desktop timeout. Pastikan desktop POS aktif dan satu jaringan.'
        : 'Tidak bisa terhubung ke desktop POS. Periksa WiFi, alamat server, dan firewall.'
    )
  } finally {
    window.clearTimeout(timeout)
  }
}

async function testRemoteConnection(store: MobileStore, config?: Partial<MobileStore['syncClient']>) {
  const baseUrl = normalizeBaseUrl(config?.baseUrl ?? store.syncClient.baseUrl)
  const token = config?.token ?? store.syncClient.token
  if (!baseUrl || !token) return fail('Alamat server sync dan token wajib diisi')

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10000)

  try {
    const health = await fetch(`${baseUrl}/health`, { signal: controller.signal })
    if (!health.ok) return fail('Server desktop tidak merespons health check')

    const response = await fetch(`${baseUrl}/api/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, channel: 'system:checkDb', args: [], device: collectAuthDeviceInfo() }),
      signal: controller.signal,
    })
    const result = await response.json().catch(() => null) as IpcResponse | null
    if (!response.ok || !result?.success) {
      return fail(result?.message ?? 'Token atau koneksi sinkronisasi tidak valid')
    }

    store.syncClient.lastConnectedAt = now()
    saveStore(store)
    return ok({ connected: true, server: baseUrl }, 'Desktop POS tersambung')
  } catch {
    return fail('Tidak bisa menghubungi desktop POS. Pastikan Android dan desktop berada di jaringan yang sama.')
  } finally {
    window.clearTimeout(timeout)
  }
}

async function postJsonText(url: string, payload: unknown) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || data?.success === false) {
      return fail(data?.message || `HTTP ${response.status}`)
    }
    return ok(data)
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Koneksi gagal')
  } finally {
    window.clearTimeout(timeout)
  }
}

async function askMobileAi(store: MobileStore, input: { question?: string; summary?: DashboardSummary }) {
  const question = String(input?.question ?? '').trim()
  if (!question || !input?.summary) return fail('Pertanyaan dan data dashboard wajib tersedia')

  const settings = normalizeIndustrySettings(store.industrySettings)
  const localAnswer = buildLocalAssistantResponse(question, input.summary)
  if (!settings.aiEnabled || settings.aiProvider === 'local' || !settings.aiApiKey) {
    return ok({ answer: localAnswer, provider: 'local', online: false })
  }

  try {
    const prompt = buildAssistantPrompt(question, input.summary)
    if (settings.aiProvider === 'gemini') {
      const model = settings.aiModel || defaultModelForProvider('gemini')
      const baseUrl = settings.aiBaseUrl || 'https://generativelanguage.googleapis.com/v1beta'
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.aiApiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 600 } }),
      })
      const data = await response.json().catch(() => null) as any
      if (!response.ok || data?.error) throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`)
      const answer = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text).filter(Boolean).join('\n').trim()
      if (!answer) throw new Error('Gemini tidak mengembalikan jawaban')
      return ok({ answer, provider: settings.aiProvider, online: true })
    }

    const model = settings.aiModel || defaultModelForProvider(settings.aiProvider)
    const url = settings.aiProvider === 'deepseek'
      ? 'https://api.deepseek.com/chat/completions'
      : settings.aiProvider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : settings.aiBaseUrl

    if (!url || !model) throw new Error('URL atau model AI belum diisi')
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.aiApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mediasoft-pos-zetass.local',
        'X-Title': 'MediaSoft POS Zetass v2.0',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 600,
        messages: [
          { role: 'system', content: 'Kamu adalah Asisten Zetass-Kar untuk aplikasi POS. Jawab ringkas dan akurat dalam Bahasa Indonesia.' },
          { role: 'user', content: prompt },
        ],
      }),
    })
    const data = await response.json().catch(() => null) as any
    if (!response.ok || data?.error) throw new Error(data?.error?.message || `AI HTTP ${response.status}`)
    const answer = data?.choices?.[0]?.message?.content?.trim()
    if (!answer) throw new Error('AI tidak mengembalikan jawaban')
    return ok({ answer, provider: settings.aiProvider, online: true })
  } catch (error) {
    return ok({
      answer: `${localAnswer}\n\nAI online belum bisa dipakai: ${error instanceof Error ? error.message : String(error)}`,
      provider: 'local-fallback',
      online: false,
    })
  }
}

export async function mobileApi<T>(channel: string, ...args: unknown[]): Promise<IpcResponse<T>> {
  const store = await readStoreAsync()
  await migrateMobileUserPasswords(store)

  if (shouldUseRemote(store, channel)) {
    return remoteInvoke<T>(store, channel, args)
  }

  switch (channel) {
    case 'sync:getStatus':
      return ok({
        mode: 'android-client',
        client: store.syncClient,
      } as T)

    case 'sync:saveConfig': {
      const data = args[0] as Partial<MobileStore['syncClient']>
      const baseUrl = data.baseUrl !== undefined ? normalizeBaseUrl(String(data.baseUrl)) : store.syncClient.baseUrl
      if (data.enabled && !baseUrl) {
        return fail('URL sinkronisasi harus HTTPS atau HTTP LAN dan tidak boleh placeholder')
      }
      store.syncClient = {
        ...store.syncClient,
        ...data,
        baseUrl,
        token: data.token !== undefined ? String(data.token).trim() : store.syncClient.token,
        enabled: Boolean(data.enabled),
      }
      saveStore(store)
      return ok({ mode: 'android-client', client: store.syncClient } as T, 'Pengaturan sinkronisasi disimpan')
    }

    case 'sync:testConnection':
      return testRemoteConnection(store, args[0] as Partial<MobileStore['syncClient']>) as Promise<IpcResponse<T>>

    case 'sync:rotateToken':
      return fail('Token dibuat di aplikasi desktop')

    case 'system:checkDb':
      return ok(undefined as T, 'Android offline store siap')

    case 'system:resetData': {
      memoryStore = createDefaultStore()
      saveStore(memoryStore)
      return ok(undefined as T, 'Data Android berhasil direset')
    }

    case 'integrations:get':
      return ok(store.industrySettings as T)

    case 'integrations:save':
      store.industrySettings = normalizeIndustrySettings(args[0] as Partial<IndustrySettings>)
      saveStore(store)
      return ok(store.industrySettings as T, 'Pengaturan industri disimpan')

    case 'integrations:testGoogleSheets': {
      const settings = normalizeIndustrySettings(store.industrySettings)
      if (!settings.googleSheetsEnabled || !settings.googleSheetsWebAppUrl) {
        return fail('Google Sheets belum diaktifkan atau URL Apps Script belum diisi')
      }
      return postJsonText(settings.googleSheetsWebAppUrl, testGoogleSheetsPayload()) as Promise<IpcResponse<T>>
    }

    case 'integrations:exportDashboardToSheets': {
      const settings = normalizeIndustrySettings(store.industrySettings)
      if (!settings.googleSheetsEnabled || !settings.googleSheetsWebAppUrl) {
        return fail('Google Sheets otomatis belum dikonfigurasi')
      }
      const result = await postJsonText(settings.googleSheetsWebAppUrl, dashboardSummaryToSheetsPayload(args[0] as DashboardSummary))
      return result.success
        ? ok({ mode: 'apps-script', result: result.data } as T, 'Dashboard berhasil dikirim ke Google Sheets')
        : ({ ...result, data: { mode: 'clipboard' } } as IpcResponse<T>)
    }

    case 'assistant:ask':
      return askMobileAi(store, args[0] as { question?: string; summary?: DashboardSummary }) as Promise<IpcResponse<T>>

    case 'auth:hasUsers':
      return ok({ hasUsers: store.users.length > 0 } as T)

    case 'auth:createInitialAdmin': {
      if (store.users.length > 0) return fail('Setup awal sudah selesai')
      const data = args[0] as AnyRecord
      const username = String(data?.username ?? '').trim()
      const namaLengkap = String(data?.nama_lengkap ?? '').trim()
      const email = String(data?.email ?? '').trim()
      const password = String(data?.password ?? '')

      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
        return fail('Username minimal 3 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau strip')
      }
      if (!namaLengkap) return fail('Nama lengkap wajib diisi')

      const validation = validatePasswordStrength(password)
      if (!validation.valid) return fail(validation.message ?? 'Password tidak valid')

      const row: MobileUser = {
        nama_pengguna: username,
        nama_lengkap: namaLengkap,
        email: null,
        no_telp: null,
        hak_akses: 'superadmin',
        status_user: 'Aktif',
        terakhir_login: null,
        tgl_wkt_simpan: now(),
        access_expires_at: null,
        password_hash: await hashMobilePassword(password),
        password_hash_type: 'bcrypt',
        must_change_password: 0,
        permissions: {},
      }
      store.users.push(row)
      saveStore(store)
      return ok(publicUser(row) as T, 'Akun admin pertama berhasil dibuat')
    }

    case 'auth:registerTrial': {
      const data = args[0] as AnyRecord
      const device = authDevice(args[1] ?? collectAuthDeviceInfo())
      const username = String(data?.username ?? '').trim()
      const namaLengkap = String(data?.nama_lengkap ?? '').trim()
      const email = String(data?.email ?? '').trim()
      const password = String(data?.password ?? '')

      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
        return fail('Username minimal 3 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau strip')
      }
      if (store.users.some(item => Number(item.is_buyer ?? 0) === 1)) {
        return fail('Akun pembeli trial sudah terdaftar. Silakan login atau upgrade akun yang sudah ada.')
      }
      if (store.users.some(item => item.nama_pengguna === username)) {
        return fail('Username sudah digunakan. Pilih username lain.')
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return fail('Email valid wajib diisi untuk daftar akun trial')
      }
      if (!namaLengkap) return fail('Nama lengkap wajib diisi')

      const validation = validatePasswordStrength(password)
      if (!validation.valid) return fail(validation.message ?? 'Password tidak valid')

      let trialPlan = store.plans.find(plan => plan.name === 'Trial 3 Hari')
      if (!trialPlan) {
        trialPlan = {
          id: nextCounter(store, 'plan'),
          name: 'Trial 3 Hari',
          price: 0,
          duration_days: 3,
          features: ['Trial terbatas 3 hari', '1 device', '20 transaksi per hari', '30 produk', 'Fitur premium terkunci'],
          is_active: false,
          is_recommended: false,
          created_at: now(),
          updated_at: null,
          max_devices: 1,
          max_transactions_per_day: 20,
          max_products: 30,
          max_users: 1,
          feature_flags: {
            reports: false,
            export_excel: false,
            export_pdf: false,
            multi_user: false,
            backup: false,
            restore: false,
            stock_opname: false,
            debt_management: false,
            shift_management: false,
            api_access: false,
            multi_branch: false,
            return_refund: false,
          },
        }
        store.plans.push(trialPlan)
      }

      const expiresAt = new Date(Date.now() + 3 * 86400000).toISOString()
      const row: MobileUser = {
        nama_pengguna: username,
        nama_lengkap: namaLengkap,
        email,
        no_telp: String(data?.no_telp ?? '').trim() || null,
        hak_akses: 'admin',
        status_user: 'Aktif',
        terakhir_login: now(),
        tgl_wkt_simpan: now(),
        access_expires_at: expiresAt,
        subscription_plan_id: Number(trialPlan.id),
        subscription_expires_at: expiresAt,
        is_buyer: 1,
        password_hash: await hashMobilePassword(password),
        password_hash_type: 'bcrypt',
        must_change_password: 0,
        permissions: {},
      }
      store.users.push(row)
      auditAuth(store, username, 'TRIAL_REGISTERED', `Akun pembeli trial 3 hari dibuat; expires_at=${expiresAt}`, device)
      saveStore(store)
      return ok(createMobileSession(row, device) as T, 'Trial 3 hari aktif. Beberapa fitur premium dikunci sampai upgrade.')
    }

    case 'auth:login': {
      const username = String(args[0] ?? '').trim()
      const password = String(args[1] ?? '')
      const device = authDevice(args[2])
      const limiterKey = `password:${username}`
      const lock = loginLockStatus(limiterKey)
      if (lock.locked) {
        const minutes = Math.ceil((lock.remainingSeconds ?? 0) / 60)
        auditAuth(store, username, 'LOGIN_BLOCKED', `Login diblokir. Tersisa ${minutes} menit`, device)
        saveStore(store)
        return fail(`Akun diblokir karena terlalu banyak percobaan login gagal. Coba lagi dalam ${minutes} menit.`)
      }

      const user = store.users.find(item => item.nama_pengguna === username)
      if (!user || user.status_user !== 'Aktif') {
        const attempt = recordFailedLoginAttempt(limiterKey)
        auditAuth(store, username, 'LOGIN_FAILED', `Username tidak ditemukan atau akun tidak aktif. Sisa percobaan: ${attempt.remainingAttempts}`, device)
        saveStore(store)
        return fail(attempt.locked ? 'Terlalu banyak percobaan login gagal. Akun diblokir selama 15 menit.' : `Username atau Password Salah! Sisa percobaan: ${attempt.remainingAttempts}`)
      }
      const passwordValid = await verifyMobilePassword(password, user)
      if (!passwordValid) {
        const attempt = recordFailedLoginAttempt(limiterKey)
        auditAuth(store, username, 'LOGIN_FAILED', `Password salah. Sisa percobaan: ${attempt.remainingAttempts}`, device)
        saveStore(store)
        return fail(attempt.locked ? 'Terlalu banyak percobaan login gagal. Akun diblokir selama 15 menit.' : `Username atau Password Salah! Sisa percobaan: ${attempt.remainingAttempts}`)
      }
      clearLoginAttempts(limiterKey)
      user.terakhir_login = now()
      auditAuth(store, username, 'LOGIN', 'Login berhasil dengan bcrypt', device)
      saveStore(store)
      return ok((user.must_change_password ? toSession(user) : createMobileSession(user, device)) as T, user.must_change_password ? 'Password wajib diganti sebelum menggunakan aplikasi' : 'Login berhasil')
    }

    case 'auth:loginPin': {
      const username = String(args[0] ?? '').trim()
      const pin = String(args[1] ?? '')
      const device = authDevice(args[2])
      if (!/^\d{4,8}$/.test(pin)) return fail('PIN kasir harus 4-8 digit angka')

      const limiterKey = `pin:${username}`
      const lock = loginLockStatus(limiterKey)
      if (lock.locked) {
        const minutes = Math.ceil((lock.remainingSeconds ?? 0) / 60)
        auditAuth(store, username, 'PIN_LOGIN_BLOCKED', `Login PIN diblokir. Tersisa ${minutes} menit`, device)
        saveStore(store)
        return fail(`Login PIN diblokir karena terlalu banyak percobaan gagal. Coba lagi dalam ${minutes} menit.`)
      }

      const user = store.users.find(item => item.nama_pengguna === username)
      if (!user || user.status_user !== 'Aktif' || user.hak_akses !== 'kasir' || !user.pin_enabled || !user.pin_hash) {
        const attempt = recordFailedLoginAttempt(limiterKey)
        auditAuth(store, username, 'PIN_LOGIN_FAILED', `PIN tidak aktif untuk user atau user bukan kasir. Sisa percobaan: ${attempt.remainingAttempts}`, device)
        saveStore(store)
        return fail(attempt.locked ? 'Terlalu banyak percobaan PIN gagal. Akun diblokir selama 15 menit.' : `Username atau PIN salah. Sisa percobaan: ${attempt.remainingAttempts}`)
      }

      const validPin = await bcrypt.compare(pin, user.pin_hash)
      if (!validPin) {
        const attempt = recordFailedLoginAttempt(limiterKey)
        auditAuth(store, username, 'PIN_LOGIN_FAILED', `PIN salah. Sisa percobaan: ${attempt.remainingAttempts}`, device)
        saveStore(store)
        return fail(attempt.locked ? 'Terlalu banyak percobaan PIN gagal. Akun diblokir selama 15 menit.' : `Username atau PIN salah. Sisa percobaan: ${attempt.remainingAttempts}`)
      }

      clearLoginAttempts(limiterKey)
      user.terakhir_login = now()
      auditAuth(store, username, 'PIN_LOGIN', 'Login PIN kasir berhasil', device)
      saveStore(store)
      return ok(createMobileSession(user, device) as T, 'Login PIN berhasil')
    }

    case 'auth:changePassword': {
      const username = String(args[0] ?? '').trim()
      const oldPassword = String(args[1] ?? '')
      const newPassword = String(args[2] ?? '')
      const user = store.users.find(item => item.nama_pengguna === username)
      if (!user) return fail('User tidak ditemukan')
      if (!(await verifyMobilePassword(oldPassword, user))) return fail('Password lama salah')

      const validation = validatePasswordStrength(newPassword)
      if (!validation.valid) return fail(validation.message ?? 'Password tidak valid')

      user.password_hash = await hashMobilePassword(newPassword)
      user.password_hash_type = 'bcrypt'
      user.password = undefined
      user.must_change_password = 0
      auditAuth(store, username, 'CHANGE_PASSWORD', 'Password berhasil diubah', authDevice(args[3]))
      saveStore(store)
      return ok({ strength: validation.strength } as T, 'Password berhasil diubah')
    }

    case 'auth:restoreSession': {
      const input = args[0] as string | AnyRecord
      const username = String(typeof input === 'string' ? input : input?.username ?? '').trim()
      const sessionToken = typeof input === 'string' ? '' : String(input?.sessionToken ?? '')
      const user = store.users.find(item => item.nama_pengguna === username)
      if (!sessionToken) return fail('Session tidak valid atau sudah kedaluwarsa')
      if (!user) return fail('Session tidak ditemukan')
      if (user.must_change_password) return fail('Password wajib diganti sebelum session dipulihkan')
      return ok(toSession(user) as T)
    }

    case 'auth:logout': {
      const input = args[0] as string | AnyRecord
      const username = String(typeof input === 'string' ? input : input?.username ?? 'unknown')
      auditAuth(store, username, 'LOGOUT', 'Logout berhasil', authDevice(typeof input === 'string' ? null : input?.deviceInfo))
      saveStore(store)
      return ok(undefined as T, 'Logout berhasil')
    }

    case 'auth:checkIdentitas':
      return ok({ hasIdentitas: true } as T)

    case 'demo:getStatus':
      return ok({ isDemo: false, username: null, role: null, violationCount: 0 } as T)

    case 'dashboard:getSummary':
      return ok(dashboardSummary(store) as T)

    case 'identitas:get':
      return ok(store.identitas as T)

    case 'identitas:save':
      store.identitas = { ...store.identitas, ...(args[0] as AnyRecord) }
      saveStore(store)
      return ok(store.identitas as T, 'Identitas berhasil disimpan')

    case 'kategori:getAll':
      return ok(getKategoriList(store) as T)

    case 'kategori:create': {
      const data = args[0] as Partial<Kategori>
      const row: Kategori = { kd_kategori_barang: nextCounter(store, 'kategori'), kategori_barang: data.kategori_barang ?? '' }
      store.kategori.push(row)
      saveStore(store)
      return ok(row as T, 'Kategori berhasil disimpan')
    }

    case 'kategori:update': {
      const id = toNumber(args[0])
      const data = args[1] as Partial<Kategori>
      const row = store.kategori.find(item => item.kd_kategori_barang === id)
      if (!row) return fail('Kategori tidak ditemukan')
      row.kategori_barang = data.kategori_barang ?? row.kategori_barang
      saveStore(store)
      return ok(row as T, 'Kategori berhasil diperbarui')
    }

    case 'kategori:delete':
      store.kategori = store.kategori.filter(item => item.kd_kategori_barang !== toNumber(args[0]))
      saveStore(store)
      return ok(undefined as T, 'Kategori berhasil dihapus')

    case 'satuan:getAll':
      return ok(store.satuan as T)

    case 'satuan:create': {
      const data = args[0] as Partial<Satuan>
      const row: Satuan = { kd_satuan: nextCounter(store, 'satuan'), nama_satuan: data.nama_satuan ?? '' }
      store.satuan.push(row)
      saveStore(store)
      return ok(row as T, 'Satuan berhasil disimpan')
    }

    case 'satuan:update': {
      const row = store.satuan.find(item => item.kd_satuan === toNumber(args[0]))
      if (!row) return fail('Satuan tidak ditemukan')
      row.nama_satuan = (args[1] as Partial<Satuan>).nama_satuan ?? row.nama_satuan
      saveStore(store)
      return ok(row as T, 'Satuan berhasil diperbarui')
    }

    case 'satuan:delete':
      store.satuan = store.satuan.filter(item => item.kd_satuan !== toNumber(args[0]))
      saveStore(store)
      return ok(undefined as T, 'Satuan berhasil dihapus')

    case 'barang:getAll':
      return ok(getBarangList(store) as T)

    case 'barang:search': {
      const query = String(args[0] ?? '').toLowerCase()
      return ok(getBarangList(store).filter(item =>
        item.kd_barang.toLowerCase().includes(query) ||
        (item.nama_barang ?? '').toLowerCase().includes(query) ||
        (item.barcode ?? '').toLowerCase().includes(query)
      ) as T)
    }

    case 'barang:create': {
      const data = args[0] as Partial<Barang>
      const kd = String(data.kd_barang || `${store.identitas.barcode_prefix || 'BRG'}${pad(nextCounter(store, 'barang'), 3)}`)
      if (store.barang.some(item => item.kd_barang === kd)) return fail('Kode barang sudah digunakan')
      const row = decorateBarang(store, {
        kd_barang: kd,
        nama_barang: data.nama_barang ?? '',
        stok: toNumber(data.stok),
        stok_minimum: toNumber(data.stok_minimum, toNumber(store.identitas.min_stok, 5)),
        foto_barang: data.foto_barang ?? null,
        deskripsi_barang: data.deskripsi_barang ?? null,
        kd_kategori_barang: data.kd_kategori_barang ?? null,
        kd_satuan: data.kd_satuan ?? null,
        jenis_transaksi: data.jenis_transaksi ?? 'INCOME',
        harga_barang: toNumber(data.harga_barang),
        potongan: toNumber(data.potongan),
        harga_modal: toNumber(data.harga_modal),
        kategori_barang: null,
        barcode: data.barcode || `${store.identitas.barcode_prefix || 'ZTS'}${pad(nextCounter(store, 'barcode'), 4)}`,
        expired_date: data.expired_date || null,
      })
      store.barang.unshift(row)
      saveStore(store)
      return ok(row as T, 'Produk berhasil disimpan')
    }

    case 'barang:update': {
      const kd = String(args[0] ?? '')
      const index = store.barang.findIndex(item => item.kd_barang === kd)
      if (index < 0) return fail('Produk tidak ditemukan')
      store.barang[index] = decorateBarang(store, { ...store.barang[index], ...(args[1] as Partial<Barang>), kd_barang: kd })
      saveStore(store)
      return ok(store.barang[index] as T, 'Produk berhasil diperbarui')
    }

    case 'barang:delete':
      store.barang = store.barang.filter(item => item.kd_barang !== String(args[0] ?? ''))
      saveStore(store)
      return ok(undefined as T, 'Produk berhasil dihapus')

    case 'barang:bulkImport': {
      const rows = Array.isArray(args[0]) ? args[0] as AnyRecord[] : []
      for (const row of rows) {
        const kd = String(row.kd_barang || `${store.identitas.barcode_prefix || 'BRG'}${pad(nextCounter(store, 'barang'), 3)}`)
        if (store.barang.some(item => item.kd_barang === kd)) continue
        store.barang.push(decorateBarang(store, {
          kd_barang: kd,
          nama_barang: String(row.nama_barang ?? row.nama ?? kd),
          stok: toNumber(row.stok),
          stok_minimum: toNumber(row.stok_minimum, toNumber(store.identitas.min_stok, 5)),
          foto_barang: null,
          deskripsi_barang: String(row.deskripsi_barang ?? ''),
          kd_kategori_barang: toNumber(row.kd_kategori_barang) || null,
          kd_satuan: toNumber(row.kd_satuan) || null,
          jenis_transaksi: 'INCOME',
          harga_barang: toNumber(row.harga_barang),
          potongan: toNumber(row.potongan),
          harga_modal: toNumber(row.harga_modal),
          kategori_barang: null,
          barcode: row.barcode ? String(row.barcode) : null,
          expired_date: row.expired_date ? String(row.expired_date) : null,
        }))
      }
      saveStore(store)
      return ok(undefined as T, `${rows.length} produk diproses`)
    }

    case 'customer:getAll':
      return ok(store.customers as T)

    case 'customer:getById':
      return ok(store.customers.find(item => item.kd_customer === String(args[0] ?? '')) as T)

    case 'customer:search': {
      const query = String(args[0] ?? '').toLowerCase()
      return ok(store.customers.filter(item => item.nama_customer.toLowerCase().includes(query) || (item.no_telp ?? '').includes(query)) as T)
    }

    case 'customer:create': {
      const data = args[0] as Partial<Customer>
      const row: Customer = {
        kd_customer: data.kd_customer ?? `CUS${pad(nextCounter(store, 'customer'), 3)}`,
        nama_customer: data.nama_customer ?? '',
        no_telp: data.no_telp ?? null,
        email: data.email ?? null,
        alamat: data.alamat ?? null,
        tgl_lahir: data.tgl_lahir ?? null,
        poin: 0,
        total_belanja: 0,
        tgl_daftar: now(),
        status: 'Aktif',
      }
      store.customers.unshift(row)
      saveStore(store)
      return ok(row as T, 'Customer berhasil disimpan')
    }

    case 'customer:update': {
      const row = store.customers.find(item => item.kd_customer === String(args[0] ?? ''))
      if (!row) return fail('Customer tidak ditemukan')
      Object.assign(row, args[1])
      saveStore(store)
      return ok(row as T, 'Customer berhasil diperbarui')
    }

    case 'customer:delete':
      store.customers = store.customers.filter(item => item.kd_customer !== String(args[0] ?? ''))
      saveStore(store)
      return ok(undefined as T, 'Customer berhasil dihapus')

    case 'customer:toggleStatus': {
      const row = store.customers.find(item => item.kd_customer === String(args[0] ?? ''))
      if (!row) return fail('Customer tidak ditemukan')
      row.status = row.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
      saveStore(store)
      return ok(row as T, 'Status customer diperbarui')
    }

    case 'customer:addPoin': {
      const row = store.customers.find(item => item.kd_customer === String(args[0] ?? ''))
      if (!row) return fail('Customer tidak ditemukan')
      row.poin = Math.max(0, toNumber(row.poin) + toNumber(args[1]))
      saveStore(store)
      return ok(row as T, 'Poin customer diperbarui')
    }

    case 'customer:getBirthdayToday': {
      const md = dateKey().slice(5)
      return ok(store.customers.filter(item => (item.tgl_lahir ?? '').slice(5) === md) as T)
    }

    case 'customer:getRiwayatPembelian':
      return ok(store.penjualan.filter(item => item.kd_customer === String(args[0] ?? '')) as T)

    case 'supplier:getAll':
      return ok(store.suppliers as T)

    case 'supplier:getById':
      return ok(store.suppliers.find(item => item.kd_suplier === String(args[0] ?? '')) as T)

    case 'supplier:create': {
      const data = args[0] as Partial<Supplier>
      const row: Supplier = {
        kd_suplier: data.kd_suplier ?? `SUP${pad(nextCounter(store, 'supplier'), 3)}`,
        nama_suplier: data.nama_suplier ?? '',
        alamat_suplier: data.alamat_suplier ?? null,
        no_telp_hp: data.no_telp_hp ?? null,
        email: data.email ?? null,
        status: 'Aktif',
        tgl_wkt_simpan: now(),
        tgl_wkt_edit: null,
      }
      store.suppliers.unshift(row)
      saveStore(store)
      return ok(row as T, 'Supplier berhasil disimpan')
    }

    case 'supplier:update': {
      const row = store.suppliers.find(item => item.kd_suplier === String(args[0] ?? ''))
      if (!row) return fail('Supplier tidak ditemukan')
      Object.assign(row, args[1], { tgl_wkt_edit: now() })
      saveStore(store)
      return ok(row as T, 'Supplier berhasil diperbarui')
    }

    case 'supplier:delete':
      store.suppliers = store.suppliers.filter(item => item.kd_suplier !== String(args[0] ?? ''))
      saveStore(store)
      return ok(undefined as T, 'Supplier berhasil dihapus')

    case 'penjualan:getAll':
      return ok(store.penjualan as T)

    case 'penjualan:getDetail': {
      const kd = String(args[0] ?? '')
      const header = store.penjualan.find(item => item.kd_tansaksi_jual === kd)
      if (!header) return fail('Transaksi tidak ditemukan')
      return ok({ header, details: store.penjualanDetails[kd] ?? [] } as T)
    }

    case 'penjualan:create':
      return createSale(store, args[0] as AnyRecord) as IpcResponse<T>

    case 'kas:getActiveKas':
      return ok(store.kasDrawers.find(item => item.status === 'OPEN' && item.username === String(args[0] ?? 'admin')) as T)

    case 'kas:getAllKas':
      return ok(store.kasDrawers as T)

    case 'kas:getKasById':
      return ok(store.kasDrawers.find(item => item.kd_kas === String(args[0] ?? '')) as T)

    case 'kas:bukaKas': {
      const username = String(args[0] ?? 'admin')
      if (store.kasDrawers.some(item => item.status === 'OPEN' && item.username === username)) return fail('Kas masih terbuka')
      const kd = `KAS-${compactDateKey()}-${pad(nextCounter(store, 'kas'), 3)}`
      const row: KasDrawer = {
        kd_kas: kd,
        tgl_buka: now(),
        tgl_tutup: null,
        username,
        modal_awal: toNumber(args[1]),
        total_penjualan: 0,
        total_pemasukan: 0,
        total_pengeluaran: 0,
        saldo_akhir: 0,
        selisih: 0,
        status: 'OPEN',
        catatan: String(args[2] ?? ''),
      }
      store.kasDrawers.unshift(row)
      saveStore(store)
      return ok(row as T, 'Kas berhasil dibuka')
    }

    case 'kas:tutupKas': {
      const row = store.kasDrawers.find(item => item.kd_kas === String(args[0] ?? ''))
      if (!row) return fail('Kas tidak ditemukan')
      const saldo = toNumber(args[1])
      const expected = toNumber(row.modal_awal) + toNumber(row.total_penjualan) + toNumber(row.total_pemasukan) - toNumber(row.total_pengeluaran)
      row.saldo_akhir = saldo
      row.selisih = saldo - expected
      row.tgl_tutup = now()
      row.status = 'CLOSED'
      row.catatan = String(args[2] ?? row.catatan ?? '')
      saveStore(store)
      return ok(row as T, 'Kas berhasil ditutup')
    }

    case 'kas:getTransaksi':
      return ok(store.kasTransactions.filter(item => item.kd_kas === String(args[0] ?? '')) as T)

    case 'kas:addPengeluaran':
      return addKasTransaction(store, String(args[0] ?? ''), 'KELUAR', toNumber(args[1]), String(args[2] ?? ''), String(args[3] ?? 'admin')) as IpcResponse<T>

    case 'kas:addPemasukan':
      return addKasTransaction(store, String(args[0] ?? ''), 'MASUK', toNumber(args[1]), String(args[2] ?? ''), String(args[3] ?? 'admin')) as IpcResponse<T>

    case 'kas:deleteTransaksi': {
      const id = toNumber(args[0])
      const row = store.kasTransactions.find(item => item.kd_kas_transaksi === id)
      if (row) {
        const drawer = store.kasDrawers.find(item => item.kd_kas === row.kd_kas)
        if (drawer) {
          if (row.jenis === 'MASUK') drawer.total_pemasukan = toNumber(drawer.total_pemasukan) - toNumber(row.jumlah)
          else drawer.total_pengeluaran = toNumber(drawer.total_pengeluaran) - toNumber(row.jumlah)
        }
      }
      store.kasTransactions = store.kasTransactions.filter(item => item.kd_kas_transaksi !== id)
      saveStore(store)
      return ok(undefined as T, 'Transaksi kas dihapus')
    }

    case 'kas:deleteKas':
      store.kasDrawers = store.kasDrawers.filter(item => item.kd_kas !== String(args[0] ?? ''))
      store.kasTransactions = store.kasTransactions.filter(item => item.kd_kas !== String(args[0] ?? ''))
      saveStore(store)
      return ok(undefined as T, 'Kas dihapus')

    case 'kas:getLaporan':
      return ok(store.kasDrawers.filter(item => item.tgl_buka.slice(0, 10) >= String(args[0] ?? '') && item.tgl_buka.slice(0, 10) <= String(args[1] ?? '9999-99-99')) as T)

    case 'laporan:penjualan':
      return ok(laporanPenjualan(store, String(args[0] ?? ''), String(args[1] ?? '')) as T)

    case 'laporan:labaRugi':
      return ok(laporanLabaRugi(store, String(args[0] ?? ''), String(args[1] ?? '')) as T)

    case 'laporan:produkTerlaris':
      return ok(produkTerlaris(store, String(args[0] ?? ''), String(args[1] ?? ''), toNumber(args[2], 10)) as T)

    case 'laporan:stok': {
      const all = getBarangList(store).map(item => ({ kd_barang: item.kd_barang, nama_barang: item.nama_barang, stok: item.stok, stok_minimum: item.stok_minimum }))
      return ok({ all, stok_menipis: all.filter(item => toNumber(item.stok) <= toNumber(item.stok_minimum, 5)) } as T)
    }

    case 'laporan:customer':
      return ok({
        customers: store.customers,
        summary: {
          total_customer: store.customers.length,
          total_poin: store.customers.reduce((sum, item) => sum + toNumber(item.poin), 0),
          total_belanja: store.customers.reduce((sum, item) => sum + toNumber(item.total_belanja), 0),
        },
      } as T)

    case 'notifikasi:getAll':
    case 'notifikasi:getUnread':
      return ok(store.notifications as T)

    case 'notifikasi:getUnreadCount':
      return ok({ count: store.notifications.filter(item => !item.dibaca).length } as T)

    case 'notifikasi:checkStokMinimum': {
      const lowStock = getBarangList(store).filter(item => toNumber(item.stok) <= toNumber(item.stok_minimum, 5))
      if (lowStock.length > 0 && store.notifications.length === 0) {
        store.notifications.unshift({
          kd_notifikasi: nextCounter(store, 'notification'),
          judul: 'Stok menipis',
          pesan: `${lowStock.length} produk perlu restock`,
          jenis: 'warning',
          tgl_dibuat: now(),
          dibaca: 0,
          username: null,
          link: '/produk',
        })
        saveStore(store)
      }
      return ok(undefined as T)
    }

    case 'notifikasi:checkExpiredProducts':
      return ok(undefined as T)

    case 'notifikasi:markAsRead': {
      const row = store.notifications.find(item => item.kd_notifikasi === toNumber(args[0]))
      if (row) row.dibaca = 1
      saveStore(store)
      return ok(undefined as T)
    }

    case 'notifikasi:markAllAsRead':
      store.notifications.forEach(item => { item.dibaca = 1 })
      saveStore(store)
      return ok(undefined as T)

    case 'notifikasi:delete':
      store.notifications = store.notifications.filter(item => item.kd_notifikasi !== toNumber(args[0]))
      saveStore(store)
      return ok(undefined as T)

    case 'notifikasi:deleteAll':
      store.notifications = []
      saveStore(store)
      return ok(undefined as T)

    case 'user:getAll':
      return ok(store.users.map(publicUser) as T)

    case 'user:getPermissions': {
      const user = store.users.find(item => item.nama_pengguna === String(args[0] ?? ''))
      return ok((user?.permissions ?? {}) as T)
    }

    case 'user:create': {
      const data = args[0] as AnyRecord
      if (store.users.some(item => item.nama_pengguna === data.nama_pengguna)) return fail('Username sudah digunakan')
      const password = String(data.password ?? data.kata_sandi ?? '')
      const validation = validatePasswordStrength(password)
      if (!validation.valid) return fail(validation.message ?? 'Password tidak valid')
      const pin = String(data.pin ?? '')
      const pinEnabled = Boolean(data.pin_enabled)
      if (pinEnabled && data.hak_akses !== 'kasir') return fail('PIN login hanya boleh diaktifkan untuk role kasir')
      if ((pin || pinEnabled) && !/^\d{4,8}$/.test(pin)) return fail('PIN kasir harus 4-8 digit angka')

      const row: MobileStore['users'][number] = {
        nama_pengguna: String(data.nama_pengguna),
        nama_lengkap: String(data.nama_lengkap ?? data.nama_pengguna),
        email: data.email ?? null,
        no_telp: data.no_telp ?? null,
        hak_akses: data.hak_akses ?? 'kasir',
        status_user: 'Aktif',
        terakhir_login: null,
        tgl_wkt_simpan: now(),
        access_expires_at: data.access_expires_at ?? null,
        password_hash: await hashMobilePassword(password),
        password_hash_type: 'bcrypt',
        pin_hash: pin ? await hashMobilePassword(pin) : null,
        pin_enabled: pin && pinEnabled ? 1 : 0,
        must_change_password: 1,
        permissions: data.permissions ?? {},
      }
      store.users.unshift(row)
      saveStore(store)
      return ok(publicUser(row) as T, 'User berhasil disimpan')
    }

    case 'user:update': {
      const row = store.users.find(item => item.nama_pengguna === String(args[0] ?? ''))
      if (!row) return fail('User tidak ditemukan')
      const data = args[1] as AnyRecord
      const pin = String(data.pin ?? '')
      const pinEnabled = Boolean(data.pin_enabled)
      const nextRole = data.hak_akses ?? row.hak_akses
      if (pinEnabled && nextRole !== 'kasir') return fail('PIN login hanya boleh diaktifkan untuk role kasir')
      if ((pin || pinEnabled) && !pin && !row.pin_hash) return fail('Isi PIN kasir sebelum mengaktifkan login PIN')
      if (pin && !/^\d{4,8}$/.test(pin)) return fail('PIN kasir harus 4-8 digit angka')
      Object.assign(row, {
        nama_lengkap: data.nama_lengkap ?? row.nama_lengkap,
        email: data.email ?? row.email,
        no_telp: data.no_telp ?? row.no_telp,
        hak_akses: data.hak_akses ?? row.hak_akses,
        access_expires_at: data.access_expires_at ?? row.access_expires_at,
        pin_enabled: pinEnabled && nextRole === 'kasir' ? 1 : 0,
        permissions: data.permissions ?? row.permissions,
      })
      if (pin) row.pin_hash = await hashMobilePassword(pin)
      if (data.password) {
        const validation = validatePasswordStrength(String(data.password))
        if (!validation.valid) return fail(validation.message ?? 'Password tidak valid')
        row.password_hash = await hashMobilePassword(String(data.password))
        row.password_hash_type = 'bcrypt'
        row.password = undefined
        row.must_change_password = 1
      }
      saveStore(store)
      return ok(publicUser(row) as T, 'User berhasil diperbarui')
    }

    case 'user:changePassword': {
      const row = store.users.find(item => item.nama_pengguna === String(args[0] ?? ''))
      if (!row) return fail('User tidak ditemukan')
      const oldPassword = String(args[1] ?? '')
      const newPassword = String(args[2] ?? '')
      if (!(await verifyMobilePassword(oldPassword, row))) return fail('Password lama salah')
      const validation = validatePasswordStrength(newPassword)
      if (!validation.valid) return fail(validation.message ?? 'Password tidak valid')
      row.password_hash = await hashMobilePassword(newPassword)
      row.password_hash_type = 'bcrypt'
      row.password = undefined
      row.must_change_password = 0
      saveStore(store)
      return ok(undefined as T, 'Password berhasil diubah')
    }

    case 'user:resetPassword': {
      const row = store.users.find(item => item.nama_pengguna === String(args[0] ?? ''))
      if (!row) return fail('User tidak ditemukan')
      const password = String(args[1] ?? '')
      const validation = validatePasswordStrength(password)
      if (!validation.valid) return fail(validation.message ?? 'Password tidak valid')
      row.password_hash = await hashMobilePassword(password)
      row.password_hash_type = 'bcrypt'
      row.password = undefined
      row.must_change_password = 1
      saveStore(store)
      return ok(undefined as T, 'Password berhasil direset. User wajib mengganti password saat login berikutnya')
    }

    case 'user:delete':
      store.users = store.users.filter(item => item.nama_pengguna !== String(args[0] ?? ''))
      saveStore(store)
      return ok(undefined as T, 'User berhasil dihapus')

    case 'user:block': {
      const row = store.users.find(item => item.nama_pengguna === String(args[0] ?? ''))
      if (!row) return fail('User tidak ditemukan')
      row.status_user = args[1] ? 'Nonaktif' : 'Aktif'
      saveStore(store)
      return ok(publicUser(row) as T, 'Status user diperbarui')
    }

    case 'user:toggleStatus': {
      const row = store.users.find(item => item.nama_pengguna === String(args[0] ?? ''))
      if (!row) return fail('User tidak ditemukan')
      row.status_user = row.status_user === 'Aktif' ? 'Nonaktif' : 'Aktif'
      saveStore(store)
      return ok(publicUser(row) as T, 'Status user diperbarui')
    }

    case 'user:extendAccess': {
      const row = store.users.find(item => item.nama_pengguna === String(args[0] ?? ''))
      if (!row) return fail('User tidak ditemukan')
      const date = new Date()
      date.setDate(date.getDate() + toNumber(args[1], 30))
      row.access_expires_at = date.toISOString()
      saveStore(store)
      return ok(publicUser(row) as T, 'Akses user diperpanjang')
    }

    case 'user:savePermissions': {
      const row = store.users.find(item => item.nama_pengguna === String(args[0] ?? ''))
      if (!row) return fail('User tidak ditemukan')
      row.permissions = args[1] as Record<string, boolean>
      saveStore(store)
      return ok(undefined as T, 'Hak akses disimpan')
    }

    case 'pembelian:getAll':
      return ok([] as T)

    case 'pembelian:getById':
      return ok(undefined as T)

    case 'pembelian:create':
    case 'pembelian:updateStatus':
    case 'pembelian:delete':
      return ok(undefined as T, 'Fitur pembelian tersimpan terbatas di Android offline')

    case 'backup:getAll':
      return ok(store.backups as T)

    case 'backup:create': {
      const fileName = `backup-android-${compactDateKey()}-${Date.now()}.json`
      const file = await writeAndroidBackupFile(fileName, store)
      return createSimpleRow(
        store,
        store.backups,
        'backup',
        {
          nama_file: fileName,
          ukuran: file.size,
          tgl_backup: now(),
          username: args[0] ?? 'system',
          keterangan: args[1] ?? file.path,
        },
        'kd_backup'
      ) as IpcResponse<T>
    }

    case 'backup:delete':
      return deleteSimpleRow(store, store.backups, args[0], 'kd_backup') as IpcResponse<T>

    case 'backup:restore': {
      const row = store.backups.find(item => String(item.kd_backup) === String(args[0]))
      if (!row?.nama_file) return fail('Backup tidak ditemukan')
      const backup = await readAndroidBackupFile(String(row.nama_file))
      memoryStore = normalizeStore(backup.store ?? null)
      saveStore(memoryStore)
      return ok(undefined as T, 'Backup Android berhasil direstore')
    }

    case 'backup:download': {
      const row = store.backups.find(item => String(item.kd_backup) === String(args[0]))
      return row ? ok({ path: `Documents/mediasoft-pos/${row.nama_file}` } as T, 'File backup tersedia di folder Documents') : fail('Backup tidak ditemukan')
    }

    case 'backup:import': {
      const base64 = String(args[0] ?? '')
      const fileName = String(args[1] ?? `import-${Date.now()}.json`)
      const json = atob(base64)
      const imported = JSON.parse(json) as { store?: MobileStore }
      if (!imported.store) return fail('File backup tidak valid')
      const importedStore = normalizeStore(imported.store)
      const file = await writeAndroidBackupFile(fileName, importedStore)
      store.backups.unshift({
        kd_backup: nextCounter(store, 'backup'),
        nama_file: fileName,
        ukuran: file.size,
        tgl_backup: now(),
        username: 'import',
        keterangan: file.path,
      })
      memoryStore = importedStore
      memoryStore.backups = store.backups
      saveStore(memoryStore)
      return ok(undefined as T, 'Backup Android berhasil diimport')
    }

    case 'activityLog:getAll':
      return ok(store.activityLogs as T)

    case 'activityLog:getByUsername':
      return ok(store.activityLogs.filter(item => item.username === args[0]) as T)

    case 'activityLog:getByModul':
      return ok(store.activityLogs.filter(item => item.modul === args[0]) as T)

    case 'activityLog:search':
      return ok(store.activityLogs as T)

    case 'activityLog:log':
      store.activityLogs.unshift({ kd_log: nextCounter(store, 'activity'), username: args[0], aktivitas: args[1], modul: args[2], detail: args[3] ?? null, tgl_aktivitas: now(), ip_address: null })
      saveStore(store)
      return ok(undefined as T)

    case 'activityLog:delete':
      return deleteSimpleRow(store, store.activityLogs, args[0], 'kd_log') as IpcResponse<T>

    case 'activityLog:deleteOldLogs':
      return ok(undefined as T)

    case 'payment:getAll':
      return ok(store.paymentMethods as T)

    case 'payment:create':
      return createSimpleRow(store, store.paymentMethods, 'payment', args[0] as AnyRecord) as IpcResponse<T>

    case 'payment:update':
      return updateSimpleRow(store, store.paymentMethods, args[0], args[1] as AnyRecord) as IpcResponse<T>

    case 'payment:delete':
      return deleteSimpleRow(store, store.paymentMethods, args[0]) as IpcResponse<T>

    case 'payment:createQris': {
      if (!store.strukSettings.qris_enabled || !store.strukSettings.qris_image) return fail('QRIS belum diupload di pengaturan struk')
      return ok({ provider: 'static', orderId: `QRIS-${Date.now()}`, qrImageUrl: store.strukSettings.qris_image, qrString: '' } as T)
    }

    case 'payment:checkStatus':
      return ok({ paid: false, failed: false, pending: true, transactionStatus: 'pending' } as T)

    case 'payment:cancelQris':
      return ok(undefined as T)

    case 'tax:getActive':
      return ok(store.taxes.find(item => item.is_active === 1) as T)

    case 'tax:getAll':
      return ok(store.taxes as T)

    case 'tax:setActive':
      store.taxes.forEach(item => { item.is_active = String(item.id) === String(args[0]) ? 1 : 0 })
      saveStore(store)
      return ok(undefined as T, 'Pajak aktif diperbarui')

    case 'tax:create':
      return createSimpleRow(store, store.taxes, 'tax', args[0] as AnyRecord) as IpcResponse<T>

    case 'tax:update':
      return updateSimpleRow(store, store.taxes, args[0], args[1] as AnyRecord) as IpcResponse<T>

    case 'tax:delete':
      return deleteSimpleRow(store, store.taxes, args[0]) as IpcResponse<T>

    case 'return:getAll':
      return ok(store.returns as T)

    case 'return:create':
      return createSimpleRow(store, store.returns, 'return', { ...(args[0] as AnyRecord), status: 'PENDING' }) as IpcResponse<T>

    case 'return:approve':
    case 'return:reject':
      return updateSimpleRow(store, store.returns, args[0], { status: channel === 'return:approve' ? 'APPROVED' : 'REJECTED', approved_by: args[1] }) as IpcResponse<T>

    case 'return:delete':
      return deleteSimpleRow(store, store.returns, args[0]) as IpcResponse<T>

    case 'shift:getCurrent':
      return ok(store.shifts.find(item => item.status === 'OPEN' && String(item.user_id) === String(args[0])) as T)

    case 'shift:getAll':
      return ok(store.shifts as T)

    case 'shift:open': {
      const data = args[0] as AnyRecord
      const row = { id: nextCounter(store, 'shift'), shift_number: `SHIFT-${compactDateKey()}-${pad(store.counters.shift ?? 1)}`, user_id: data.user_id, start_time: now(), opening_balance: toNumber(data.opening_balance), total_sales: 0, total_transactions: 0, status: 'OPEN' }
      store.shifts.unshift(row)
      saveStore(store)
      return ok(row as T, 'Shift dibuka')
    }

    case 'shift:close':
      return updateSimpleRow(store, store.shifts, args[0], { ...(args[1] as AnyRecord), end_time: now(), status: 'CLOSED' }) as IpcResponse<T>

    case 'shift:delete':
      return deleteSimpleRow(store, store.shifts, args[0]) as IpcResponse<T>

    case 'debt:getAll':
      return ok((args[0] ? store.debts.filter(item => item.type === args[0]) : store.debts) as T)

    case 'debt:create':
      return createSimpleRow(store, store.debts, 'debt', { ...(args[0] as AnyRecord), status: 'UNPAID', paid_amount: 0 }) as IpcResponse<T>

    case 'debt:addPayment': {
      const id = String(args[0])
      const payment: AnyRecord = { ...(args[1] as AnyRecord), id: nextCounter(store, 'debt'), debt_id: args[0], created_at: now() }
      store.debtPayments[id] = [...(store.debtPayments[id] ?? []), payment]
      const debt = store.debts.find(item => String(item.id) === id)
      if (debt) {
        debt.paid_amount = toNumber(debt.paid_amount) + toNumber(payment.amount)
        debt.remaining_amount = Math.max(0, toNumber(debt.remaining_amount) - toNumber(payment.amount))
        debt.status = debt.remaining_amount <= 0 ? 'PAID' : 'PARTIAL'
      }
      saveStore(store)
      return ok(payment as T, 'Pembayaran hutang disimpan')
    }

    case 'debt:getPayments':
      return ok((store.debtPayments[String(args[0])] ?? []) as T)

    case 'debt:delete':
      return deleteSimpleRow(store, store.debts, args[0]) as IpcResponse<T>

    case 'opname:getAll':
      return ok(store.stockOpnames as T)

    case 'opname:create':
      return createSimpleRow(store, store.stockOpnames, 'opname', { ...(args[0] as AnyRecord), status: 'DRAFT' }) as IpcResponse<T>

    case 'opname:approve':
      return updateSimpleRow(store, store.stockOpnames, args[0], { status: 'APPROVED', approved_by: args[1] }) as IpcResponse<T>

    case 'opname:getDetails':
    case 'opname:getItems':
      return ok((store.stockOpnameItems[String(args[0])] ?? []) as T)

    case 'opname:addItem': {
      const data = args[0] as AnyRecord
      const id = String(data.opname_id)
      const row = { ...data, id: nextCounter(store, 'opname') }
      store.stockOpnameItems[id] = [...(store.stockOpnameItems[id] ?? []), row]
      saveStore(store)
      return ok(row as T, 'Item opname disimpan')
    }

    case 'opname:delete':
      return deleteSimpleRow(store, store.stockOpnames, args[0]) as IpcResponse<T>

    case 'productImage:getByProduct':
      return ok(store.productImages.filter(item => String(item.barang_id) === String(args[0])) as T)

    case 'productImage:add':
      return createSimpleRow(store, store.productImages, 'productImage', { barang_id: args[0], image_path: args[1], is_primary: args[2] ? 1 : 0 }) as IpcResponse<T>

    case 'productImage:delete':
      return deleteSimpleRow(store, store.productImages, args[0]) as IpcResponse<T>

    case 'productImage:setPrimary':
      store.productImages.forEach(item => { if (String(item.barang_id) === String(args[1])) item.is_primary = String(item.id) === String(args[0]) ? 1 : 0 })
      saveStore(store)
      return ok(undefined as T)

    case 'update:check':
      return ok({ hasUpdate: false, latest: null } as T)

    case 'update:getHistory':
      return ok([] as T)

    case 'errorLog:log':
    case 'errorLog:deleteOld':
    case 'errorLog:clear':
      return ok(undefined as T)

    case 'errorLog:getAll':
      return ok([] as T)

    case 'plan:getAll':
      return ok(store.plans as T)

    case 'plan:getActive':
      return ok(store.plans.filter(item => item.is_active) as T)

    case 'plan:create':
      return createSimpleRow(store, store.plans, 'plan', args[0] as AnyRecord) as IpcResponse<T>

    case 'plan:update':
      return updateSimpleRow(store, store.plans, args[0], args[1] as AnyRecord) as IpcResponse<T>

    case 'plan:deactivate':
      return updateSimpleRow(store, store.plans, args[0], { is_active: false }) as IpcResponse<T>

    case 'tutorial:getAll':
      return ok(store.tutorials as T)

    case 'tutorial:getById':
      return ok(store.tutorials.find(item => String(item.id) === String(args[0])) as T)

    case 'tutorial:create':
      return createSimpleRow(store, store.tutorials, 'tutorial', args[0] as AnyRecord) as IpcResponse<T>

    case 'tutorial:update':
      return updateSimpleRow(store, store.tutorials, args[0], args[1] as AnyRecord) as IpcResponse<T>

    case 'tutorial:delete':
      return deleteSimpleRow(store, store.tutorials, args[0]) as IpcResponse<T>

    case 'hpp:calculate': {
      const data = args[0] as AnyRecord
      const row = { id: nextCounter(store, 'hpp'), ...data, total_hpp: toNumber(data.modal) + toNumber(data.biaya_lain), created_at: now() }
      store.hppHistory.unshift(row)
      saveStore(store)
      return ok(row as T, 'HPP dihitung')
    }

    case 'hpp:getHistory':
      return ok(store.hppHistory.filter(item => !args[0] || item.user_id === args[0]) as T)

    case 'hpp:getUsageCount':
      return ok({ count: store.hppHistory.filter(item => item.user_id === args[0]).length } as T)

    case 'hpp:delete':
      return deleteSimpleRow(store, store.hppHistory, args[0]) as IpcResponse<T>

    case 'strukSettings:get':
      return ok(store.strukSettings as T)

    case 'strukSettings:update':
      store.strukSettings = { ...store.strukSettings, ...(args[0] as AnyRecord), updated_at: now() }
      saveStore(store)
      return ok(store.strukSettings as T, 'Pengaturan struk disimpan')

    case 'strukSettings:uploadQris':
      store.strukSettings = { ...store.strukSettings, qris_image: String(args[0] ?? ''), qris_enabled: 1, updated_at: now() }
      saveStore(store)
      return ok(store.strukSettings as T, 'QRIS disimpan')

    case 'strukSettings:removeQris':
      store.strukSettings = { ...store.strukSettings, qris_image: null, qris_enabled: 0, updated_at: now() }
      saveStore(store)
      return ok(store.strukSettings as T, 'QRIS dihapus')

    case 'currency:getAll':
    case 'currency:getActive':
      return ok((channel === 'currency:getActive' ? store.currencies.filter(item => item.is_active) : store.currencies) as T)

    case 'currency:create':
      return createSimpleRow(store, store.currencies, 'currency', args[0] as AnyRecord) as IpcResponse<T>

    case 'currency:update':
      return updateSimpleRow(store, store.currencies, args[0], args[1] as AnyRecord) as IpcResponse<T>

    case 'currency:delete':
      return deleteSimpleRow(store, store.currencies, args[0]) as IpcResponse<T>

    case 'currency:setDefault':
      store.currencies.forEach(item => { item.is_default = String(item.id) === String(args[0]) ? 1 : 0 })
      saveStore(store)
      return ok(undefined as T)

    case 'warehouse:getAll':
      return ok(store.warehouses as T)

    case 'warehouse:create':
      return createSimpleRow(store, store.warehouses, 'warehouse', args[0] as AnyRecord) as IpcResponse<T>

    case 'inventory:getBatches':
      return ok((store.batches[String(args[0])] ?? []) as T)

    case 'inventory:addBatch': {
      const data = args[0] as AnyRecord
      const kd = String(data.kd_barang)
      const row = { ...data, id: nextCounter(store, 'warehouse') }
      store.batches[kd] = [...(store.batches[kd] ?? []), row]
      saveStore(store)
      return ok(row as T)
    }

    case 'inventory:getSerials':
      return ok((store.serials[String(args[0])] ?? []) as T)

    case 'inventory:addSerial': {
      const data = args[0] as AnyRecord
      const kd = String(data.kd_barang)
      const row = { ...data, id: nextCounter(store, 'warehouse') }
      store.serials[kd] = [...(store.serials[kd] ?? []), row]
      saveStore(store)
      return ok(row as T)
    }

    case 'inventory:transfer':
      return ok(undefined as T, 'Transfer stok dicatat')

    case 'promo:getAll':
    case 'promo:getActive':
      return ok((channel === 'promo:getActive' ? store.promos.filter(item => item.is_active === 1) : store.promos) as T)

    case 'promo:create':
      return createSimpleRow(store, store.promos, 'promo', { ...(args[0] as AnyRecord), usage_count: 0 }) as IpcResponse<T>

    case 'promo:update':
      return updateSimpleRow(store, store.promos, args[0], args[1] as AnyRecord) as IpcResponse<T>

    case 'promo:delete':
      return deleteSimpleRow(store, store.promos, args[0]) as IpcResponse<T>

    case 'promo:validate':
      return validatePromo(store, String(args[0] ?? ''), toNumber(args[1])) as IpcResponse<T>

    case 'promo:apply': {
      const promo = store.promos.find(item => String(item.code).toUpperCase() === String(args[0] ?? '').toUpperCase())
      if (promo) promo.usage_count = toNumber(promo.usage_count) + 1
      saveStore(store)
      return ok(undefined as T)
    }

    case 'branch:getAll':
    case 'branch:getActive':
    case 'branch:getWarehouses':
      return ok(store.branches as T)

    case 'branch:getById':
      return ok(store.branches.find(item => String(item.id) === String(args[0])) as T)

    case 'branch:create':
      return createSimpleRow(store, store.branches, 'branch', args[0] as AnyRecord) as IpcResponse<T>

    case 'branch:update':
      return updateSimpleRow(store, store.branches, args[0], args[1] as AnyRecord) as IpcResponse<T>

    case 'branch:delete':
      return deleteSimpleRow(store, store.branches, args[0]) as IpcResponse<T>

    case 'branch:transferStock':
      return ok(undefined as T, 'Transfer stok dicatat')

    case 'loyalty:getTiers':
      return ok(store.loyaltyTiers as T)

    case 'loyalty:getCustomerTier':
      return ok(store.loyaltyTiers[0] as T)

    case 'loyalty:calculatePoints':
      return ok({ points: Math.floor(toNumber(args[0]) / 10000) } as T)

    case 'loyalty:redeemPoints':
      return ok(undefined as T, 'Poin ditukar')

    case 'loyalty:createTier':
      return createSimpleRow(store, store.loyaltyTiers, 'loyaltyTier', args[0] as AnyRecord) as IpcResponse<T>

    case 'loyalty:updateTier':
      return updateSimpleRow(store, store.loyaltyTiers, args[0], args[1] as AnyRecord) as IpcResponse<T>

    case 'loyalty:deleteTier':
      return deleteSimpleRow(store, store.loyaltyTiers, args[0]) as IpcResponse<T>

    case 'audit:getAll':
      return ok(store.audit as T)

    case 'audit:log':
      return createSimpleRow(store, store.audit, 'audit', args[0] as AnyRecord) as IpcResponse<T>

    case 'audit:clear':
      store.audit = []
      saveStore(store)
      return ok(undefined as T)

    case 'mobile:getSummary':
      return ok(dashboardSummary(store) as T)

    case 'mobile:processScan': {
      const product = getBarangList(store).find(item => item.barcode === args[0])
      return product ? ok(product as T) : fail('Barcode tidak ditemukan')
    }

    case 'whatsapp:get':
      return ok(store.whatsapp as T)

    case 'whatsapp:save':
      store.whatsapp = { ...store.whatsapp, ...(args[0] as AnyRecord) }
      saveStore(store)
      return ok(store.whatsapp as T, 'Pengaturan WhatsApp disimpan')

    case 'whatsapp:test':
      return ok(undefined as T, 'Tes WhatsApp Android offline berhasil')

    case 'security:get':
      return ok(store.security as T)

    case 'security:save':
      store.security = { ...store.security, ...(args[0] as AnyRecord) }
      saveStore(store)
      return ok(store.security as T, 'Pengaturan keamanan disimpan')

    case 'ecommerce:get':
      return ok(store.ecommerce as T)

    case 'ecommerce:save':
      store.ecommerce = { ...store.ecommerce, ...(args[0] as AnyRecord) }
      saveStore(store)
      return ok(store.ecommerce as T, 'Pengaturan ecommerce disimpan')

    case 'dialog:showSaveDialog':
      return ok({ canceled: false, filePath: 'Android Download' } as T)

    case 'export:penjualanExcel':
    case 'export:penjualanPDF':
    case 'export:stokExcel':
    case 'export:stokPDF':
    case 'export:toExcel':
    case 'export:toPDF':
      return ok(undefined as T, 'Export Android selesai')

    case 'print:getPrinters':
      return ok([] as T)

    case 'print:execute':
      try {
        window.print()
      } catch {
        // Android WebView may not expose print.
      }
      return ok(undefined as T, 'Perintah cetak diproses')

    case 'scheduler:runStokCheck':
    case 'scheduler:runExpiredCheck':
    case 'scheduler:runDebtCheck':
    case 'scheduler:runBackup':
    case 'scheduler:runCleanLogs':
      return ok(undefined as T)

    case 'barcode:generate':
      return ok(`${store.identitas.barcode_prefix || 'ZTS'}${pad(nextCounter(store, 'barcode'), 4)}` as T)

    case 'barcode:search':
      return ok(getBarangList(store).find(item => item.barcode === String(args[0] ?? '')) as T)

    case 'barcode:getSettings':
      return ok({ prefix: store.identitas.barcode_prefix, next_number: store.counters.barcode, length: 13 } as T)

    case 'barcode:updateSettings':
      store.identitas.barcode_prefix = (args[0] as AnyRecord)?.prefix ?? store.identitas.barcode_prefix
      saveStore(store)
      return ok(undefined as T, 'Pengaturan barcode disimpan')

    default:
      if (channel.includes(':get') || channel.includes(':search') || channel.startsWith('laporan:')) {
        return ok([] as T)
      }
      return fail(`Fitur ${channel} belum tersedia di Android offline`)
  }
}
