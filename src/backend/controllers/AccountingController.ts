import { sqlite } from '../../database/connection.js'

const ACCOUNTS_TABLE = 'mediasoft_accounts'
const JOURNAL_TABLE = 'mediasoft_journal_entries'
const JOURNAL_LINES_TABLE = 'mediasoft_journal_lines'

interface JournalLineInput {
  account_id: number
  debit?: number
  credit?: number
  memo?: string
}

interface JournalInput {
  entry_date?: string
  reference?: string
  description?: string
  lines?: JournalLineInput[]
  created_by?: string
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function queryNumber(sql: string, params: unknown[] = []) {
  const row = sqlite.prepare(sql).get(...params) as { value?: number } | undefined
  return toNumber(row?.value)
}

function initTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ${ACCOUNTS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      normal_balance TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ${JOURNAL_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL,
      reference TEXT DEFAULT '',
      description TEXT NOT NULL,
      created_by TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ${JOURNAL_LINES_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      memo TEXT DEFAULT '',
      FOREIGN KEY(entry_id) REFERENCES ${JOURNAL_TABLE}(id),
      FOREIGN KEY(account_id) REFERENCES ${ACCOUNTS_TABLE}(id)
    );
  `)

  const count = queryNumber(`SELECT COUNT(*) AS value FROM ${ACCOUNTS_TABLE}`)
  if (count > 0) return

  const now = new Date().toISOString()
  const defaults = [
    ['1000', 'Kas', 'ASSET', 'DEBIT'],
    ['1100', 'Piutang Usaha', 'ASSET', 'DEBIT'],
    ['1200', 'Persediaan', 'ASSET', 'DEBIT'],
    ['2000', 'Hutang Usaha', 'LIABILITY', 'CREDIT'],
    ['3000', 'Modal Pemilik', 'EQUITY', 'CREDIT'],
    ['4000', 'Penjualan', 'REVENUE', 'CREDIT'],
    ['5000', 'Harga Pokok Penjualan', 'EXPENSE', 'DEBIT'],
    ['5100', 'Beban Operasional', 'EXPENSE', 'DEBIT'],
  ]

  const stmt = sqlite.prepare(`
    INSERT INTO ${ACCOUNTS_TABLE} (code, name, type, normal_balance, created_at)
    VALUES (?, ?, ?, ?, ?)
  `)
  defaults.forEach(row => stmt.run(...row, now))
}
initTables()

export class AccountingController {
  static getAccounts() {
    try {
      initTables()
      const data = sqlite.prepare(`SELECT * FROM ${ACCOUNTS_TABLE} ORDER BY code`).all()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static saveAccount(data: any) {
    try {
      initTables()
      const now = new Date().toISOString()
      const type = String(data.type || 'ASSET').toUpperCase()
      const normal = ['ASSET', 'EXPENSE'].includes(type) ? 'DEBIT' : 'CREDIT'

      if (!String(data.code || '').trim() || !String(data.name || '').trim()) {
        return { success: false, message: 'Kode dan nama akun wajib diisi' }
      }

      if (data.id) {
        sqlite.prepare(`
          UPDATE ${ACCOUNTS_TABLE}
          SET code = ?, name = ?, type = ?, normal_balance = ?, is_active = ?
          WHERE id = ?
        `).run(data.code, data.name, type, normal, data.is_active === false ? 0 : 1, data.id)
        return { success: true, message: 'Akun diperbarui' }
      }

      const result = sqlite.prepare(`
        INSERT INTO ${ACCOUNTS_TABLE} (code, name, type, normal_balance, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.code, data.name, type, normal, data.is_active === false ? 0 : 1, now)
      return { success: true, data: { id: result.lastInsertRowid }, message: 'Akun ditambahkan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static deleteAccount(id: number) {
    try {
      initTables()
      const used = queryNumber(`SELECT COUNT(*) AS value FROM ${JOURNAL_LINES_TABLE} WHERE account_id = ?`, [id])
      if (used > 0) {
        sqlite.prepare(`UPDATE ${ACCOUNTS_TABLE} SET is_active = 0 WHERE id = ?`).run(id)
        return { success: true, message: 'Akun dinonaktifkan karena sudah punya jurnal' }
      }
      sqlite.prepare(`DELETE FROM ${ACCOUNTS_TABLE} WHERE id = ?`).run(id)
      return { success: true, message: 'Akun dihapus' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getJournalEntries(limit = 100) {
    try {
      initTables()
      const entries = sqlite.prepare(`
        SELECT * FROM ${JOURNAL_TABLE}
        ORDER BY entry_date DESC, id DESC
        LIMIT ?
      `).all(Math.max(1, Math.min(Number(limit) || 100, 500))) as any[]

      const lines = sqlite.prepare(`
        SELECT jl.*, a.code, a.name, a.type
        FROM ${JOURNAL_LINES_TABLE} jl
        JOIN ${ACCOUNTS_TABLE} a ON a.id = jl.account_id
        WHERE jl.entry_id = ?
        ORDER BY jl.id
      `)

      return {
        success: true,
        data: entries.map(entry => ({
          ...entry,
          lines: lines.all(entry.id),
        })),
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static createJournalEntry(data: JournalInput) {
    try {
      initTables()
      const lines = Array.isArray(data.lines) ? data.lines : []
      if (!String(data.description || '').trim()) return { success: false, message: 'Deskripsi jurnal wajib diisi' }
      if (lines.length < 2) return { success: false, message: 'Jurnal minimal berisi 2 baris' }

      const debit = lines.reduce((sum, line) => sum + toNumber(line.debit), 0)
      const credit = lines.reduce((sum, line) => sum + toNumber(line.credit), 0)
      if (Math.round(debit) !== Math.round(credit) || debit <= 0) {
        return { success: false, message: 'Total debit dan kredit harus seimbang' }
      }

      const now = new Date().toISOString()
      const entryDate = data.entry_date || now.slice(0, 10)
      const create = sqlite.transaction(() => {
        const result = sqlite.prepare(`
          INSERT INTO ${JOURNAL_TABLE} (entry_date, reference, description, created_by, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(entryDate, data.reference || '', data.description, data.created_by || '', now)
        const entryId = Number(result.lastInsertRowid)
        const stmt = sqlite.prepare(`
          INSERT INTO ${JOURNAL_LINES_TABLE} (entry_id, account_id, debit, credit, memo)
          VALUES (?, ?, ?, ?, ?)
        `)
        lines.forEach(line => {
          stmt.run(entryId, line.account_id, toNumber(line.debit), toNumber(line.credit), line.memo || '')
        })
        return entryId
      })

      return { success: true, data: { id: create() }, message: 'Jurnal disimpan' }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getSummary(startDate?: string, endDate?: string) {
    try {
      initTables()
      const range = this.periodRange(startDate, endDate)
      const sales = queryNumber(`
        SELECT COALESCE(SUM(COALESCE(sub_total, 0) - COALESCE(discount_amount, 0)), 0) AS value
        FROM mediasoft_penjualan
        WHERE date(tgl_wkt_transaksi) BETWEEN date(?) AND date(?)
      `, range)
      const cogs = queryNumber(`
        SELECT COALESCE(SUM(COALESCE(harga_modal, 0) * COALESCE(qty, 0)), 0) AS value
        FROM mediasoft_penjualan_detail
        WHERE kd_tansaksi_jual IN (
          SELECT kd_tansaksi_jual FROM mediasoft_penjualan
          WHERE date(tgl_wkt_transaksi) BETWEEN date(?) AND date(?)
        )
      `, range)
      const purchases = queryNumber(`
        SELECT COALESCE(SUM(COALESCE(sub_total, 0)), 0) AS value
        FROM mediasoft_pembelian
        WHERE date(tgl_wkt_transaksi) BETWEEN date(?) AND date(?)
      `, range)
      const expenses = queryNumber(`
        SELECT COALESCE(SUM(COALESCE(jumlah, 0)), 0) AS value
        FROM mediasoft_kas_transaksi
        WHERE jenis = 'KELUAR' AND date(tgl_transaksi) BETWEEN date(?) AND date(?)
      `, range)
      const cashIn = queryNumber(`
        SELECT COALESCE(SUM(COALESCE(yang_dibayar, 0)), 0) AS value
        FROM mediasoft_penjualan
        WHERE date(tgl_wkt_transaksi) BETWEEN date(?) AND date(?)
      `, range) + queryNumber(`
        SELECT COALESCE(SUM(COALESCE(jumlah, 0)), 0) AS value
        FROM mediasoft_kas_transaksi
        WHERE jenis = 'MASUK' AND date(tgl_transaksi) BETWEEN date(?) AND date(?)
      `, range)
      const cashOut = queryNumber(`
        SELECT COALESCE(SUM(COALESCE(yang_dibayar, 0)), 0) AS value
        FROM mediasoft_pembelian
        WHERE date(tgl_wkt_transaksi) BETWEEN date(?) AND date(?)
      `, range) + expenses
      const receivables = queryNumber(`
        SELECT COALESCE(SUM(MAX(COALESCE(sub_total, 0) + COALESCE(pajak, 0) - COALESCE(discount_amount, 0) - COALESCE(yang_dibayar, 0), 0)), 0) AS value
        FROM mediasoft_penjualan
        WHERE date(tgl_wkt_transaksi) BETWEEN date(?) AND date(?)
      `, range)
      const payables = queryNumber(`
        SELECT COALESCE(SUM(COALESCE(sisa_hutang, 0)), 0) AS value
        FROM mediasoft_pembelian
        WHERE date(tgl_wkt_transaksi) BETWEEN date(?) AND date(?)
      `, range)

      return {
        success: true,
        data: {
          period: { startDate: range[0], endDate: range[1] },
          sales,
          cogs,
          grossProfit: sales - cogs,
          purchases,
          expenses,
          netProfit: sales - cogs - expenses,
          cashIn,
          cashOut,
          cashBalanceEstimate: cashIn - cashOut,
          receivables,
          payables,
        },
      }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  static getTrialBalance(startDate?: string, endDate?: string) {
    try {
      initTables()
      const range = this.periodRange(startDate, endDate)
      const rows = sqlite.prepare(`
        SELECT
          a.id,
          a.code,
          a.name,
          a.type,
          a.normal_balance,
          COALESCE(SUM(jl.debit), 0) AS debit,
          COALESCE(SUM(jl.credit), 0) AS credit
        FROM ${ACCOUNTS_TABLE} a
        LEFT JOIN ${JOURNAL_LINES_TABLE} jl ON jl.account_id = a.id
        LEFT JOIN ${JOURNAL_TABLE} je ON je.id = jl.entry_id
          AND date(je.entry_date) BETWEEN date(?) AND date(?)
        WHERE a.is_active = 1
        GROUP BY a.id
        ORDER BY a.code
      `).all(...range) as any[]

      const summaryResult = this.getSummary(range[0], range[1]) as any
      const summary = summaryResult.data || {}
      const derived: Record<string, { debit?: number; credit?: number }> = {
        '1000': { debit: summary.cashIn, credit: summary.cashOut },
        '1100': { debit: summary.receivables },
        '1200': { debit: summary.purchases, credit: summary.cogs },
        '2000': { credit: summary.payables },
        '4000': { credit: summary.sales },
        '5000': { debit: summary.cogs },
        '5100': { debit: summary.expenses },
      }

      const data = rows.map(row => {
        const extra = derived[row.code] || {}
        const debit = toNumber(row.debit) + toNumber(extra.debit)
        const credit = toNumber(row.credit) + toNumber(extra.credit)
        return {
          ...row,
          debit,
          credit,
          balance: row.normal_balance === 'DEBIT' ? debit - credit : credit - debit,
        }
      })

      return { success: true, data }
    } catch (error) {
      return { success: false, message: String(error) }
    }
  }

  private static periodRange(startDate?: string, endDate?: string): [string, string] {
    const now = new Date()
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const end = endDate || now.toISOString().slice(0, 10)
    return [start, end]
  }
}
