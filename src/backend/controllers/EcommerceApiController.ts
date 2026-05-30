import { sqlite } from '../../database/connection.js'
import { ActivityLogModel } from '../models/ActivityLogModel.js'
import { BarangModel } from '../models/BarangModel.js'
import { WooCommerceProvider, type EcommerceProduct } from '../services/ecommerceProvider.js'
import { decryptData, encryptData } from '../services/crypto.js'

const TABLE = 'mediasoft_ecommerce_api'
const GATEWAY_TABLE = 'mediasoft_payment_gateway_settings'
const PROVIDER_TABLE = 'mediasoft_ecommerce_provider_settings'
const LOG_TABLE = 'mediasoft_ecommerce_sync_log'
const QUEUE_TABLE = 'mediasoft_ecommerce_sync_queue'
const SECRET_PREFIX = 'enc:v1:'

function encryptionSecret() {
  return process.env.MEDIASOFT_LOCAL_SECRET || `${process.cwd()}:mediasoft-pos-zetass:v2`
}

function encryptSecret(value: unknown) {
  const plain = String(value ?? '').trim()
  if (!plain) return ''
  if (plain.startsWith(SECRET_PREFIX)) return plain
  return `${SECRET_PREFIX}${encryptData(plain, encryptionSecret())}`
}

function decryptSecret(value: unknown) {
  const stored = String(value ?? '').trim()
  if (!stored) return ''
  if (!stored.startsWith(SECRET_PREFIX)) return stored
  try {
    return decryptData(stored.slice(SECRET_PREFIX.length), encryptionSecret())
  } catch {
    return ''
  }
}

function migrateSecret(table: string, column: string, value: unknown) {
  const stored = String(value ?? '').trim()
  if (!stored || stored.startsWith(SECRET_PREFIX)) return
  sqlite.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = 1`).run(encryptSecret(stored))
}

function ensureColumn(table: string, name: string, definition: string) {
  const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  if (!cols.some(c => c.name === name)) {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
  }
}

function initTable() {
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        id INTEGER PRIMARY KEY DEFAULT 1,
        api_key TEXT DEFAULT '',
        api_secret TEXT DEFAULT '',
        webhook_url TEXT DEFAULT '',
        enabled INTEGER DEFAULT 0,
        updated_at TEXT
      )
    `)
    ensureColumn(TABLE, 'whatsapp_number', 'TEXT DEFAULT NULL')
    ensureColumn(TABLE, 'payment_link', 'TEXT DEFAULT NULL')
    ensureColumn(TABLE, 'auto_activate', 'INTEGER DEFAULT 0')
    ensureColumn(TABLE, 'activation_plan_id', 'INTEGER DEFAULT NULL')
    sqlite.prepare(`INSERT OR IGNORE INTO ${TABLE} (id) VALUES (1)`).run()
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ${GATEWAY_TABLE} (
        id INTEGER PRIMARY KEY DEFAULT 1,
        provider TEXT DEFAULT 'midtrans',
        server_key TEXT DEFAULT '',
        client_key TEXT DEFAULT '',
        is_production INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 0,
        updated_at TEXT
      )
    `)
    sqlite.prepare(`INSERT OR IGNORE INTO ${GATEWAY_TABLE} (id) VALUES (1)`).run()

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ${PROVIDER_TABLE} (
        id INTEGER PRIMARY KEY DEFAULT 1,
        platform TEXT DEFAULT 'woocommerce',
        store_url TEXT DEFAULT '',
        consumer_key TEXT DEFAULT '',
        consumer_secret TEXT DEFAULT '',
        enabled INTEGER DEFAULT 0,
        auto_sync INTEGER DEFAULT 0,
        interval_minutes INTEGER DEFAULT 30,
        last_sync_at TEXT,
        last_status TEXT DEFAULT 'Belum pernah sync',
        last_error TEXT DEFAULT '',
        updated_at TEXT
      )
    `)
    sqlite.prepare(`INSERT OR IGNORE INTO ${PROVIDER_TABLE} (id) VALUES (1)`).run()
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ${LOG_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL
      )
    `)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ${QUEUE_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        next_retry_at TEXT,
        status TEXT DEFAULT 'pending',
        last_error TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT
      )
    `)
  } catch (e) {
    console.error('EcommerceApi table init failed:', e)
  }
}
initTable()

function logSync(status: 'success' | 'error' | 'info', message: string, detail?: unknown) {
  sqlite.prepare(`INSERT INTO ${LOG_TABLE} (status, message, detail, created_at) VALUES (?, ?, ?, ?)`)
    .run(status, message, detail === undefined ? null : JSON.stringify(detail), new Date().toISOString())
}

function providerConfig() {
  initTable()
  const row = sqlite.prepare(`SELECT * FROM ${PROVIDER_TABLE} WHERE id = 1`).get() as any
  migrateSecret(PROVIDER_TABLE, 'consumer_key', row?.consumer_key)
  migrateSecret(PROVIDER_TABLE, 'consumer_secret', row?.consumer_secret)
  return {
    ...row,
    consumer_key: decryptSecret(row?.consumer_key),
    consumer_secret: decryptSecret(row?.consumer_secret),
  }
}

function createProvider(row = providerConfig()) {
  if ((row.platform ?? 'woocommerce') !== 'woocommerce') {
    throw new Error('Provider e-commerce belum didukung')
  }
  return new WooCommerceProvider({
    storeUrl: row.store_url ?? '',
    consumerKey: row.consumer_key ?? '',
    consumerSecret: row.consumer_secret ?? '',
  })
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function productCode(product: EcommerceProduct) {
  const sku = String(product.sku ?? '').trim()
  return sku || `WOO-${product.id}`
}

function syncProductsToLocal(products: EcommerceProduct[]) {
  const local = BarangModel.getAll()
  let created = 0
  let updated = 0

  for (const product of products) {
    const code = productCode(product)
    const existing = local.find(item => item.kd_barang === code || item.barcode === code)
    const price = toNumber(product.regular_price || product.price)
    const stock = product.stock_quantity ?? 0
    const payload = {
      nama_barang: product.name || code,
      stok: toNumber(stock),
      barcode: product.sku || code,
      harga_barang: price,
      jenis_transaksi: 'INCOME',
      kd_kategori_barang: 0,
      kd_satuan: 0,
    }

    if (existing) {
      BarangModel.update(existing.kd_barang, payload)
      updated += 1
    } else {
      BarangModel.create({
        kd_barang: code,
        ...payload,
        tgl_wkt_simpan: new Date().toISOString().replace('T', ' ').slice(0, 19),
        nama_pengguna: 'ecommerce-sync',
      } as any)
      created += 1
    }
  }

  return { created, updated }
}

async function processRetryQueue(provider: WooCommerceProvider) {
  const due = sqlite.prepare(`
    SELECT * FROM ${QUEUE_TABLE}
    WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= ?)
    ORDER BY id ASC
    LIMIT 10
  `).all(new Date().toISOString()) as any[]
  let processed = 0

  for (const item of due) {
    try {
      const payload = JSON.parse(item.payload)
      if (item.action === 'updateStock') {
        await provider.updateStock(payload.productId, payload.qty)
      }
      sqlite.prepare(`UPDATE ${QUEUE_TABLE} SET status = 'done', updated_at = ? WHERE id = ?`).run(new Date().toISOString(), item.id)
      processed += 1
    } catch (error) {
      const attempts = Number(item.attempts ?? 0) + 1
      const retryAt = new Date(Date.now() + Math.min(60, attempts * 5) * 60000).toISOString()
      sqlite.prepare(`UPDATE ${QUEUE_TABLE} SET attempts = ?, next_retry_at = ?, last_error = ?, updated_at = ? WHERE id = ?`)
        .run(attempts, retryAt, error instanceof Error ? error.message : String(error), new Date().toISOString(), item.id)
    }
  }

  return processed
}

export class EcommerceApiController {
  static get() {
    try {
      const row = sqlite.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get() as any
      const gateway = sqlite.prepare(`SELECT * FROM ${GATEWAY_TABLE} WHERE id = 1`).get() as any
      migrateSecret(TABLE, 'api_secret', row?.api_secret)
      migrateSecret(GATEWAY_TABLE, 'server_key', gateway?.server_key)
      migrateSecret(GATEWAY_TABLE, 'client_key', gateway?.client_key)
      return {
        success: true,
        data: {
          apiKey: row?.api_key ?? '',
          apiSecret: decryptSecret(row?.api_secret),
          webhookUrl: row?.webhook_url ?? '',
          enabled: !!row?.enabled,
          whatsappNumber: row?.whatsapp_number ?? '',
          paymentLink: row?.payment_link ?? '',
          autoActivate: !!row?.auto_activate,
          activationPlanId: row?.activation_plan_id ?? null,
          paymentGateway: {
            provider: gateway?.provider ?? 'midtrans',
            serverKey: decryptSecret(gateway?.server_key),
            clientKey: decryptSecret(gateway?.client_key),
            isProduction: !!gateway?.is_production,
            enabled: !!gateway?.enabled,
          },
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static save(data: any, caller?: string | null) {
    try {
      sqlite.prepare(`
        UPDATE ${TABLE} SET
          api_key = ?,
          api_secret = ?,
          webhook_url = ?,
          enabled = ?,
          whatsapp_number = ?,
          payment_link = ?,
          auto_activate = ?,
          activation_plan_id = ?,
          updated_at = ?
        WHERE id = 1
      `).run(
        data.apiKey ?? '',
        encryptSecret(data.apiSecret),
        data.webhookUrl ?? '',
        data.enabled ? 1 : 0,
        data.whatsappNumber ?? '',
        data.paymentLink ?? '',
        data.autoActivate ? 1 : 0,
        data.activationPlanId ? Number(data.activationPlanId) : null,
        new Date().toISOString()
      )
      sqlite.prepare(`
        UPDATE ${GATEWAY_TABLE} SET
          provider = ?,
          server_key = ?,
          client_key = ?,
          is_production = ?,
          enabled = ?,
          updated_at = ?
        WHERE id = 1
      `).run(
        data.paymentGateway?.provider ?? 'midtrans',
        encryptSecret(data.paymentGateway?.serverKey),
        encryptSecret(data.paymentGateway?.clientKey),
        data.paymentGateway?.isProduction ? 1 : 0,
        data.paymentGateway?.enabled ? 1 : 0,
        new Date().toISOString()
      )
      if (caller) {
        ActivityLogModel.log(
          caller,
          'Mengubah konfigurasi E-commerce API/payment gateway',
          'ECOMMERCE_API',
          `gateway=${data.paymentGateway?.provider ?? 'midtrans'}; auto_activate=${data.autoActivate ? 1 : 0}; activation_plan_id=${data.activationPlanId ?? '-'}`,
          'payment'
        )
      }
      return { success: true }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getIntegration() {
    try {
      const row = providerConfig()
      const logs = sqlite.prepare(`SELECT * FROM ${LOG_TABLE} ORDER BY id DESC LIMIT 20`).all()
      const queue = sqlite.prepare(`SELECT * FROM ${QUEUE_TABLE} WHERE status = 'pending' ORDER BY id DESC LIMIT 20`).all()
      return {
        success: true,
        data: {
          platform: row.platform ?? 'woocommerce',
          storeUrl: row.store_url ?? '',
          consumerKey: decryptSecret(row.consumer_key),
          consumerSecret: decryptSecret(row.consumer_secret),
          enabled: !!row.enabled,
          autoSync: !!row.auto_sync,
          intervalMinutes: row.interval_minutes ?? 30,
          lastSyncAt: row.last_sync_at ?? null,
          lastStatus: row.last_status ?? 'Belum pernah sync',
          lastError: row.last_error ?? '',
          logs,
          queue,
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static saveIntegration(data: any, caller?: string | null) {
    try {
      const interval = [15, 30, 60].includes(Number(data.intervalMinutes)) ? Number(data.intervalMinutes) : 30
      sqlite.prepare(`
        UPDATE ${PROVIDER_TABLE} SET
          platform = ?,
          store_url = ?,
          consumer_key = ?,
          consumer_secret = ?,
          enabled = ?,
          auto_sync = ?,
          interval_minutes = ?,
          updated_at = ?
        WHERE id = 1
      `).run(
        data.platform || 'woocommerce',
        String(data.storeUrl ?? '').trim().replace(/\/+$/, ''),
        encryptSecret(data.consumerKey),
        encryptSecret(data.consumerSecret),
        data.enabled ? 1 : 0,
        data.autoSync ? 1 : 0,
        interval,
        new Date().toISOString()
      )
      if (caller) {
        ActivityLogModel.log(caller, 'Mengubah integrasi WooCommerce', 'ECOMMERCE_SYNC', `auto_sync=${data.autoSync ? 1 : 0}; interval=${interval}`, 'integration')
      }
      return this.getIntegration()
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static async syncNow(caller?: string | null) {
    try {
      const row = providerConfig()
      if (!row.enabled) return { success: false, message: 'Integrasi e-commerce belum aktif' }

      const provider = createProvider(row)
      const retried = await processRetryQueue(provider)
      const [products, orders] = await Promise.all([
        provider.getProducts(),
        provider.getOrders(),
      ])
      const productResult = syncProductsToLocal(products)
      const message = `Sync selesai: ${productResult.created} produk baru, ${productResult.updated} produk diperbarui, ${orders.length} order masuk, ${retried} retry diproses`
      sqlite.prepare(`UPDATE ${PROVIDER_TABLE} SET last_sync_at = ?, last_status = ?, last_error = '' WHERE id = 1`)
        .run(new Date().toISOString(), message)
      logSync('success', message, { orders: orders.map(order => ({ id: order.id, status: order.status, total: order.total })) })
      if (caller) ActivityLogModel.log(caller, message, 'ECOMMERCE_SYNC', JSON.stringify({ created: productResult.created, updated: productResult.updated }), 'integration')
      return { success: true, data: { products: productResult, orders: orders.length, retried }, message }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      sqlite.prepare(`UPDATE ${PROVIDER_TABLE} SET last_error = ?, last_status = ? WHERE id = 1`).run(message, 'Sync gagal')
      logSync('error', 'Sync WooCommerce gagal', message)
      return { success: false, message }
    }
  }

  static enqueueStockUpdate(productId: string | number, qty: number) {
    try {
      sqlite.prepare(`INSERT INTO ${QUEUE_TABLE} (action, payload, created_at) VALUES (?, ?, ?)`)
        .run('updateStock', JSON.stringify({ productId, qty }), new Date().toISOString())
      return { success: true, message: 'Update stok masuk queue retry' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
