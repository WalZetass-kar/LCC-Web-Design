import { sqlite } from '../../database/connection.js'

const CHANNEL_TABLE = 'mediasoft_marketplace_channels'
const MAP_TABLE = 'mediasoft_marketplace_sku_map'
const LOG_TABLE = 'mediasoft_marketplace_sync_log'

function initTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ${CHANNEL_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      name TEXT NOT NULL,
      store_url TEXT DEFAULT '',
      api_key TEXT DEFAULT '',
      api_secret TEXT DEFAULT '',
      auto_sync INTEGER DEFAULT 0,
      sync_stock INTEGER DEFAULT 1,
      sync_orders INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      last_sync_at TEXT,
      last_status TEXT DEFAULT 'Belum pernah sync',
      created_at TEXT NOT NULL,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ${MAP_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL,
      local_sku TEXT NOT NULL,
      remote_sku TEXT NOT NULL,
      remote_product_id TEXT DEFAULT '',
      last_stock INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT,
      UNIQUE(channel_id, local_sku, remote_sku)
    );

    CREATE TABLE IF NOT EXISTS ${LOG_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL
    );
  `)
}
initTables()

function redact(row: any) {
  return {
    ...row,
    api_key: row?.api_key ? '••••••••' : '',
    api_secret: row?.api_secret ? '••••••••' : '',
  }
}

export class MarketplaceController {
  static getChannels() {
    try {
      initTables()
      const channels = sqlite.prepare(`SELECT * FROM ${CHANNEL_TABLE} ORDER BY is_active DESC, name ASC`).all() as any[]
      const logs = sqlite.prepare(`SELECT * FROM ${LOG_TABLE} ORDER BY id DESC LIMIT 30`).all()
      return { success: true, data: { channels: channels.map(redact), logs } }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static saveChannel(data: any) {
    try {
      initTables()
      const now = new Date().toISOString()
      const platform = String(data.platform || 'custom').toLowerCase()
      const name = String(data.name || '').trim()
      if (!name) return { success: false, message: 'Nama channel wajib diisi' }

      if (data.id) {
        const current = sqlite.prepare(`SELECT api_key, api_secret FROM ${CHANNEL_TABLE} WHERE id = ?`).get(data.id) as any
        const apiKey = String(data.api_key || '').includes('••') ? current?.api_key || '' : data.api_key || ''
        const apiSecret = String(data.api_secret || '').includes('••') ? current?.api_secret || '' : data.api_secret || ''
        sqlite.prepare(`
          UPDATE ${CHANNEL_TABLE}
          SET platform = ?, name = ?, store_url = ?, api_key = ?, api_secret = ?,
            auto_sync = ?, sync_stock = ?, sync_orders = ?, is_active = ?, updated_at = ?
          WHERE id = ?
        `).run(platform, name, data.store_url || '', apiKey, apiSecret, data.auto_sync ? 1 : 0, data.sync_stock ? 1 : 0, data.sync_orders ? 1 : 0, data.is_active === false ? 0 : 1, now, data.id)
        return { success: true, message: 'Channel marketplace diperbarui' }
      }

      const result = sqlite.prepare(`
        INSERT INTO ${CHANNEL_TABLE}
          (platform, name, store_url, api_key, api_secret, auto_sync, sync_stock, sync_orders, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(platform, name, data.store_url || '', data.api_key || '', data.api_secret || '', data.auto_sync ? 1 : 0, data.sync_stock ? 1 : 0, data.sync_orders ? 1 : 0, data.is_active === false ? 0 : 1, now, now)
      return { success: true, data: { id: result.lastInsertRowid }, message: 'Channel marketplace ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static deleteChannel(id: number) {
    try {
      initTables()
      sqlite.prepare(`UPDATE ${CHANNEL_TABLE} SET is_active = 0, updated_at = ? WHERE id = ?`).run(new Date().toISOString(), id)
      return { success: true, message: 'Channel dinonaktifkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getSkuMap(channelId?: number) {
    try {
      initTables()
      const maps = channelId
        ? sqlite.prepare(`SELECT * FROM ${MAP_TABLE} WHERE channel_id = ? ORDER BY local_sku`).all(channelId)
        : sqlite.prepare(`SELECT * FROM ${MAP_TABLE} ORDER BY channel_id, local_sku`).all()
      const unmapped = sqlite.prepare(`
        SELECT b.kd_barang, b.nama_barang, b.barcode, COALESCE(b.stok, 0) AS stok
        FROM mediasoft_barang b
        WHERE NOT EXISTS (
          SELECT 1 FROM ${MAP_TABLE} m
          WHERE m.local_sku = b.kd_barang AND m.is_active = 1
        )
        ORDER BY b.nama_barang
        LIMIT 30
      `).all()
      return { success: true, data: { maps, unmapped } }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static saveSkuMap(data: any) {
    try {
      initTables()
      if (!data.channel_id || !data.local_sku || !data.remote_sku) {
        return { success: false, message: 'Channel, SKU lokal, dan SKU marketplace wajib diisi' }
      }
      const now = new Date().toISOString()
      if (data.id) {
        sqlite.prepare(`
          UPDATE ${MAP_TABLE}
          SET channel_id = ?, local_sku = ?, remote_sku = ?, remote_product_id = ?, is_active = ?, updated_at = ?
          WHERE id = ?
        `).run(data.channel_id, data.local_sku, data.remote_sku, data.remote_product_id || '', data.is_active === false ? 0 : 1, now, data.id)
        return { success: true, message: 'Mapping SKU diperbarui' }
      }
      sqlite.prepare(`
        INSERT INTO ${MAP_TABLE} (channel_id, local_sku, remote_sku, remote_product_id, is_active, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(channel_id, local_sku, remote_sku) DO UPDATE SET
          remote_product_id = excluded.remote_product_id,
          is_active = excluded.is_active,
          updated_at = excluded.updated_at
      `).run(data.channel_id, data.local_sku, data.remote_sku, data.remote_product_id || '', data.is_active === false ? 0 : 1, now)
      return { success: true, message: 'Mapping SKU disimpan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static runStockSync(channelId?: number) {
    try {
      initTables()
      const now = new Date().toISOString()
      const where = channelId ? 'WHERE m.channel_id = ? AND m.is_active = 1' : 'WHERE m.is_active = 1'
      const params = channelId ? [channelId] : []
      const rows = sqlite.prepare(`
        SELECT m.*, c.name AS channel_name, c.platform, b.nama_barang, COALESCE(b.stok, 0) AS stok
        FROM ${MAP_TABLE} m
        JOIN ${CHANNEL_TABLE} c ON c.id = m.channel_id
        JOIN mediasoft_barang b ON b.kd_barang = m.local_sku
        ${where}
      `).all(...params) as any[]

      const updateMap = sqlite.prepare(`UPDATE ${MAP_TABLE} SET last_stock = ?, updated_at = ? WHERE id = ?`)
      rows.forEach(row => updateMap.run(row.stok, now, row.id))

      if (channelId) {
        sqlite.prepare(`UPDATE ${CHANNEL_TABLE} SET last_sync_at = ?, last_status = ? WHERE id = ?`)
          .run(now, `${rows.length} SKU siap dikirim`, channelId)
      }

      sqlite.prepare(`INSERT INTO ${LOG_TABLE} (channel_id, status, message, detail, created_at) VALUES (?, ?, ?, ?, ?)`)
        .run(channelId || null, 'success', `Sync stok MVP selesai: ${rows.length} SKU diproses`, JSON.stringify(rows.slice(0, 20)), now)

      return {
        success: true,
        data: rows,
        message: rows.length
          ? `${rows.length} SKU siap disinkronkan ke marketplace`
          : 'Belum ada mapping SKU aktif untuk disinkronkan',
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }
}
