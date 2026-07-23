#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import Database from 'better-sqlite3'

const SOURCE_DB_PATH = path.resolve(process.env.QA_STRESS_DB_PATH || path.join(process.cwd(), 'sistem_pos.db'))
const PRODUCT_COUNT = Math.max(1, Number(process.env.QA_STRESS_PRODUCT_COUNT || 1000))
const TRANSACTION_COUNT = Math.max(1, Number(process.env.QA_STRESS_TRANSACTION_COUNT || 125))
const KEEP_ARTIFACTS = process.env.QA_STRESS_KEEP_ARTIFACTS === '1'

function log(message) {
  console.log(`[qa:stress] ${message}`)
}

function fail(message) {
  throw new Error(message)
}

function pad(value, length) {
  return String(value).padStart(length, '0')
}

function isoNow() {
  return new Date().toISOString()
}

function getCount(db, table, where = '') {
  return db.prepare(`SELECT COUNT(*) AS cnt FROM ${table}${where ? ` ${where}` : ''}`).get().cnt ?? 0
}

function assert(condition, message) {
  if (!condition) fail(message)
}

async function main() {
  const startedAt = performance.now()
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zetass-pos-qa-stress-'))
  const clonePath = path.join(workDir, 'stress-copy.db')
  const backupPath = path.join(workDir, 'stress-backup.db')
  const corruptPath = path.join(workDir, 'corrupt.db')

  let sourceDb = null
  let cloneDb = null
  let backupDb = null

  try {
    if (!fs.existsSync(SOURCE_DB_PATH)) {
      fail(`Database sumber tidak ditemukan: ${SOURCE_DB_PATH}`)
    }

    log(`Source DB: ${SOURCE_DB_PATH}`)
    log(`Working dir: ${workDir}`)

    sourceDb = new Database(SOURCE_DB_PATH, { readonly: true, fileMustExist: true })
    await sourceDb.backup(clonePath)
    sourceDb.close()
    sourceDb = null

    cloneDb = new Database(clonePath)
    cloneDb.pragma('foreign_keys = ON')

    const baseline = {
      barang: getCount(cloneDb, 'mediasoft_barang'),
      penjualan: getCount(cloneDb, 'mediasoft_penjualan'),
      pengguna: getCount(cloneDb, 'mediasoft_pengguna'),
      sessions: getCount(cloneDb, 'mediasoft_auth_sessions'),
      warehouses: getCount(cloneDb, 'mediasoft_warehouses'),
      transfers: getCount(cloneDb, 'mediasoft_stock_transfers'),
    }

    const seedStart = performance.now()
    const seed = cloneDb.transaction(() => {
      const now = isoNow()
      const ownerUser = 'qa_owner'
      const cashierUser = 'qa_cashier'
      const customerId = 'QA-CUST-001'
      const drawerId = 'QA-KAS-001'
      const categoryName = 'QA Stress Category'
      const unitName = 'pcs'
      const warehouseAName = 'QA Warehouse A'
      const warehouseBName = 'QA Warehouse B'

      cloneDb.prepare(
        `
          INSERT OR REPLACE INTO mediasoft_identitas (
            kode, namatoko, barcode_prefix, auto_barcode, auto_print, auto_backup,
            backup_retention, notif_stok, min_stok
          ) VALUES (1, ?, ?, 1, 0, 1, 7, 1, 5)
        `,
      ).run('QA Stress Store', 'QA')

      cloneDb.prepare(
        `
          INSERT OR REPLACE INTO mediasoft_pengguna (
            nama_pengguna, kata_sandi, nama_lengkap, tgl_wkt_simpan, tgl_wkt_edit,
            status_user, terakhir_login, hak_akses, email, no_telp,
            access_expires_at, password_hash_type, must_change_password,
            pin_hash, pin_hash_type, pin_enabled, is_buyer
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(
        ownerUser,
        'qa-owner-password',
        'QA Owner',
        now,
        now,
        'Aktif',
        now,
        'developer',
        'qa.owner@example.com',
        '081200000001',
        null,
        'bcrypt',
        0,
        null,
        'bcrypt',
        0,
        0,
      )

      cloneDb.prepare(
        `
          INSERT OR REPLACE INTO mediasoft_pengguna (
            nama_pengguna, kata_sandi, nama_lengkap, tgl_wkt_simpan, tgl_wkt_edit,
            status_user, terakhir_login, hak_akses, email, no_telp,
            access_expires_at, password_hash_type, must_change_password,
            pin_hash, pin_hash_type, pin_enabled, is_buyer
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(
        cashierUser,
        'qa-cashier-password',
        'QA Cashier',
        now,
        now,
        'Aktif',
        now,
        'kasir',
        'qa.cashier@example.com',
        '081200000002',
        null,
        'bcrypt',
        0,
        null,
        'bcrypt',
        1,
        0,
      )

      const ownerSessionHash = crypto.createHash('sha256').update(`${ownerUser}-${now}-session`).digest('hex')
      const cashierSessionHash = crypto.createHash('sha256').update(`${cashierUser}-${now}-session`).digest('hex')
      cloneDb.prepare(
        `
          INSERT OR REPLACE INTO mediasoft_auth_sessions (
            username, token_hash, issued_at, expires_at, revoked_at, last_seen_at,
            ip_address, device_id, device_name, user_agent, platform, os_name,
            app_version, is_revoked
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(ownerUser, ownerSessionHash, now, now, null, now, '127.0.0.1', 'qa-owner-device', 'QA Owner Device', 'qa-stress', 'desktop', 'linux', '1.0.0', 0)
      cloneDb.prepare(
        `
          INSERT OR REPLACE INTO mediasoft_auth_sessions (
            username, token_hash, issued_at, expires_at, revoked_at, last_seen_at,
            ip_address, device_id, device_name, user_agent, platform, os_name,
            app_version, is_revoked
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(cashierUser, cashierSessionHash, now, now, null, now, '127.0.0.1', 'qa-cashier-device', 'QA Cashier Device', 'qa-stress', 'desktop', 'linux', '1.0.0', 0)

      const categoryId = Number(cloneDb.prepare('INSERT INTO mediasoft_kategori_barang (kategori_barang) VALUES (?)').run(categoryName).lastInsertRowid)
      const unitId = Number(cloneDb.prepare('INSERT INTO mediasoft_satuan (nama_satuan) VALUES (?)').run(unitName).lastInsertRowid)
      cloneDb.prepare(
        `
          INSERT OR REPLACE INTO mediasoft_customer (
            kd_customer, nama_customer, no_telp, email, alamat, tgl_lahir, poin,
            total_belanja, tgl_daftar, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(
        customerId,
        'QA Customer',
        '081200000003',
        'qa.customer@example.com',
        'Jl. QA Stress No. 1',
        null,
        0,
        0,
        now,
        'Aktif',
      )

      const warehouseA = Number(cloneDb.prepare(
        'INSERT INTO mediasoft_warehouses (name, location, is_active, created_at) VALUES (?, ?, ?, ?)',
      ).run(warehouseAName, 'Lab QA A', 1, now).lastInsertRowid)
      const warehouseB = Number(cloneDb.prepare(
        'INSERT INTO mediasoft_warehouses (name, location, is_active, created_at) VALUES (?, ?, ?, ?)',
      ).run(warehouseBName, 'Lab QA B', 1, now).lastInsertRowid)

      cloneDb.prepare(
        `
          INSERT OR REPLACE INTO mediasoft_kas_drawer (
            kd_kas, tgl_buka, tgl_tutup, username, modal_awal, total_penjualan,
            total_pemasukan, total_pengeluaran, saldo_akhir, selisih, status, catatan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      ).run(drawerId, now, null, ownerUser, 150000, 0, 0, 0, 150000, 0, 'OPEN', 'QA stress drawer')

      const insertBarang = cloneDb.prepare(
        `
          INSERT INTO mediasoft_barang (
            kd_barang, nama_barang, tgl_wkt_simpan, tgl_wkt_ubah, foto_barang,
            deskripsi_barang, nama_pengguna, stok, stok_minimum, kd_satuan,
            jenis_transaksi, kd_kategori_barang, barcode, expired_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      const insertHarga = cloneDb.prepare(
        'INSERT INTO mediasoft_harga (kd_barang, harga_barang, potongan, harga_modal) VALUES (?, ?, ?, ?)',
      )

      for (let index = 1; index <= PRODUCT_COUNT; index += 1) {
        const kdBarang = `QA-STRESS-PROD-${pad(index, 4)}`
        const barcode = `QA-STRESS-BC-${pad(index, 4)}`
        insertBarang.run(
          kdBarang,
          `QA Stress Product ${index}`,
          now,
          now,
          null,
          `Produk uji beban ${index}`,
          index % 2 === 0 ? ownerUser : cashierUser,
          500,
          5,
          unitId,
          'INCOME',
          categoryId,
          barcode,
          null,
        )
        insertHarga.run(kdBarang, 15000 + index, 0, 10000 + index)
      }

      const insertSale = cloneDb.prepare(
        `
          INSERT INTO mediasoft_penjualan (
            kd_tansaksi_jual, tgl_wkt_transaksi, deskripsi, username_transaksi,
            total_qty, sub_total, pajak, yang_dibayar, kembalian,
            jenis_pembayaran, discount_amount, shift_id, kd_customer
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      const insertDetail = cloneDb.prepare(
        `
          INSERT INTO mediasoft_penjualan_detail (
            kd_tansaksi_jual, kd_barang, harga_modal, harga_jual, qty, disc,
            harga_disc, total_harga_jual, nama_pengguna, tgl_waktu_input
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      const updateStock = cloneDb.prepare('UPDATE mediasoft_barang SET stok = stok - ? WHERE kd_barang = ?')
      const insertCash = cloneDb.prepare(
        'INSERT INTO mediasoft_kas_transaksi (kd_kas, tgl_transaksi, jenis, jumlah, keterangan, username) VALUES (?, ?, ?, ?, ?, ?)',
      )
      const insertTransfer = cloneDb.prepare(
        `
          INSERT INTO mediasoft_stock_transfers (
            kd_barang, from_warehouse_id, to_warehouse_id, from_branch_id, to_branch_id,
            qty, notes, username, transferred_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )

      for (let index = 1; index <= TRANSACTION_COUNT; index += 1) {
        const saleId = `QA-SALE-${pad(index, 4)}`
        const saleUser = index % 2 === 0 ? ownerUser : cashierUser
        const productA = `QA-STRESS-PROD-${pad(((index - 1) % PRODUCT_COUNT) + 1, 4)}`
        const productB = `QA-STRESS-PROD-${pad(((index + 11 - 1) % PRODUCT_COUNT) + 1, 4)}`
        const qtyA = (index % 3) + 1
        const qtyB = (index % 2) + 1
        const priceA = 15000 + (((index - 1) % PRODUCT_COUNT) + 1)
        const priceB = 15000 + (((index + 11 - 1) % PRODUCT_COUNT) + 1)
        const modalA = 10000 + (((index - 1) % PRODUCT_COUNT) + 1)
        const modalB = 10000 + (((index + 11 - 1) % PRODUCT_COUNT) + 1)
        const subtotal = (priceA * qtyA) + (priceB * qtyB)
        const totalQty = qtyA + qtyB
        const paid = subtotal

        insertSale.run(
          saleId,
          now,
          'QA stress sale',
          saleUser,
          totalQty,
          subtotal,
          0,
          paid,
          0,
          'TUNAI',
          0,
          null,
          customerId,
        )

        insertDetail.run(saleId, productA, modalA, priceA, qtyA, 0, 0, priceA * qtyA, saleUser, now)
        insertDetail.run(saleId, productB, modalB, priceB, qtyB, 0, 0, priceB * qtyB, saleUser, now)
        updateStock.run(qtyA, productA)
        updateStock.run(qtyB, productB)
        insertCash.run(drawerId, now, 'MASUK', subtotal, `QA sale ${saleId}`, saleUser)
      }

      insertTransfer.run(
        'QA-STRESS-PROD-0001',
        warehouseA,
        warehouseB,
        1,
        2,
        12,
        'QA stress transfer',
        ownerUser,
        ownerUser,
        now,
      )

      cloneDb.prepare(
        `
          UPDATE mediasoft_kas_drawer
          SET total_penjualan = ?,
              total_pemasukan = ?,
              saldo_akhir = modal_awal + ?,
              selisih = 0,
              status = 'OPEN'
          WHERE kd_kas = ?
        `,
      ).run(
        cloneDb.prepare(
          'SELECT COALESCE(SUM(sub_total), 0) AS total FROM mediasoft_penjualan WHERE kd_tansaksi_jual LIKE ?',
        ).get('QA-SALE-%').total,
        cloneDb.prepare(
          'SELECT COALESCE(SUM(jumlah), 0) AS total FROM mediasoft_kas_transaksi WHERE kd_kas = ?',
        ).get(drawerId).total,
        cloneDb.prepare(
          'SELECT COALESCE(SUM(sub_total), 0) AS total FROM mediasoft_penjualan WHERE kd_tansaksi_jual LIKE ?',
        ).get('QA-SALE-%').total,
        drawerId,
      )
    })

    seed()
    const seedMs = performance.now() - seedStart

    const verificationStart = performance.now()
    const counts = {
      barang: getCount(cloneDb, 'mediasoft_barang'),
      penjualan: getCount(cloneDb, 'mediasoft_penjualan'),
      pengguna: getCount(cloneDb, 'mediasoft_pengguna'),
      sessions: getCount(cloneDb, 'mediasoft_auth_sessions'),
      warehouses: getCount(cloneDb, 'mediasoft_warehouses'),
      transfers: getCount(cloneDb, 'mediasoft_stock_transfers'),
    }

    assert(counts.barang >= baseline.barang + PRODUCT_COUNT, `Jumlah produk tidak bertambah sesuai target (${counts.barang} < ${baseline.barang + PRODUCT_COUNT})`)
    assert(counts.penjualan >= baseline.penjualan + TRANSACTION_COUNT, `Jumlah transaksi tidak bertambah sesuai target (${counts.penjualan} < ${baseline.penjualan + TRANSACTION_COUNT})`)
    assert(counts.pengguna >= baseline.pengguna + 2, 'Multi-user seed gagal: user QA tidak bertambah')
    assert(counts.sessions >= baseline.sessions + 2, 'Session QA tidak bertambah')
    assert(counts.warehouses >= baseline.warehouses + 2, 'Warehouse QA tidak bertambah')
    assert(counts.transfers >= baseline.transfers + 1, 'Stock transfer QA tidak bertambah')

    const barcodeRow = cloneDb.prepare(
      'SELECT kd_barang, nama_barang FROM mediasoft_barang WHERE barcode = ? LIMIT 1',
    ).get('QA-STRESS-BC-0001')
    assert(barcodeRow?.kd_barang === 'QA-STRESS-PROD-0001', 'Lookup barcode gagal pada produk uji pertama')

    const userRow = cloneDb.prepare(
      'SELECT COUNT(*) AS cnt FROM mediasoft_pengguna WHERE nama_pengguna IN (?, ?)',
    ).get('qa_owner', 'qa_cashier')
    assert(userRow.cnt === 2, 'Seed multi-user tidak lengkap')

    const sessionRow = cloneDb.prepare(
      'SELECT COUNT(*) AS cnt FROM mediasoft_auth_sessions WHERE username IN (?, ?)',
    ).get('qa_owner', 'qa_cashier')
    assert(sessionRow.cnt === 2, 'Seed session multi-user tidak lengkap')

    const foreignKeyIssues = cloneDb.prepare('PRAGMA foreign_key_check').all()
    assert(foreignKeyIssues.length === 0, `Foreign key check gagal: ${JSON.stringify(foreignKeyIssues)}`)

    const integrityCheck = cloneDb.prepare('PRAGMA integrity_check').get()
    assert(integrityCheck?.integrity_check === 'ok', `Integrity check gagal: ${JSON.stringify(integrityCheck)}`)

    await cloneDb.backup(backupPath)
    backupDb = new Database(backupPath, { readonly: true, fileMustExist: true })
    const backupIntegrity = backupDb.prepare('PRAGMA integrity_check').get()
    assert(backupIntegrity?.integrity_check === 'ok', `Backup integrity check gagal: ${JSON.stringify(backupIntegrity)}`)
    assert(getCount(backupDb, 'mediasoft_barang') === counts.barang, 'Backup count produk tidak cocok')
    assert(getCount(backupDb, 'mediasoft_penjualan') === counts.penjualan, 'Backup count transaksi tidak cocok')

    fs.writeFileSync(corruptPath, crypto.randomBytes(256))
    let corruptRejected = false
    try {
      const corruptDb = new Database(corruptPath, { readonly: true, fileMustExist: true })
      try {
        corruptDb.prepare('PRAGMA integrity_check').get()
      } finally {
        corruptDb.close()
      }
    } catch {
      corruptRejected = true
    }
    assert(corruptRejected, 'Database corrupt tidak terdeteksi')

    const verificationMs = performance.now() - verificationStart
    const totalMs = performance.now() - startedAt

    log(`OK integrity, foreign key, backup/restore, barcode lookup, multi-user, dan corrupt detection`)
    log(`Seeded ${PRODUCT_COUNT} produk + ${TRANSACTION_COUNT} transaksi pada salinan DB`)
    log(`Seed time: ${seedMs.toFixed(1)} ms`)
    log(`Verification time: ${verificationMs.toFixed(1)} ms`)
    log(`Total runtime: ${totalMs.toFixed(1)} ms`)
  } finally {
    try { if (backupDb) backupDb.close() } catch {}
    try { if (cloneDb) cloneDb.close() } catch {}
    try { if (sourceDb) sourceDb.close() } catch {}
    if (!KEEP_ARTIFACTS) {
      fs.rmSync(workDir, { recursive: true, force: true })
    } else {
      log(`Artefak dipertahankan di ${workDir}`)
    }
  }
}

main().catch(error => {
  console.error(`[qa:stress] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
