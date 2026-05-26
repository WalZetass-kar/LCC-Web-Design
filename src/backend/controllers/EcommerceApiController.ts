import { sqlite } from '../../database/connection.js'
import { ActivityLogModel } from '../models/ActivityLogModel.js'

const TABLE = 'mediasoft_ecommerce_api'
const GATEWAY_TABLE = 'mediasoft_payment_gateway_settings'

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
  } catch (e) {
    console.error('EcommerceApi table init failed:', e)
  }
}
initTable()

export class EcommerceApiController {
  static get() {
    try {
      const row = sqlite.prepare(`SELECT * FROM ${TABLE} WHERE id = 1`).get() as any
      const gateway = sqlite.prepare(`SELECT * FROM ${GATEWAY_TABLE} WHERE id = 1`).get() as any
      return {
        success: true,
        data: {
          apiKey: row?.api_key ?? '',
          apiSecret: row?.api_secret ?? '',
          webhookUrl: row?.webhook_url ?? '',
          enabled: !!row?.enabled,
          whatsappNumber: row?.whatsapp_number ?? '',
          paymentLink: row?.payment_link ?? '',
          autoActivate: !!row?.auto_activate,
          activationPlanId: row?.activation_plan_id ?? null,
          paymentGateway: {
            provider: gateway?.provider ?? 'midtrans',
            serverKey: gateway?.server_key ?? '',
            clientKey: gateway?.client_key ?? '',
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
        data.apiSecret ?? '',
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
        data.paymentGateway?.serverKey ?? '',
        data.paymentGateway?.clientKey ?? '',
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
}
