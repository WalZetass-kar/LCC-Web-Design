import { db } from '../../database/connection.js'
import {
  bankAccounts, bankTransactions, reconciliation,
  fixedAssets, assetDepreciation, budgets,
} from '../../database/schema.js'
import { eq, and, desc, gte, lte } from 'drizzle-orm'

export class FinanceModel {
  // ─── Bank Accounts ───────────────────────────────────────────────
  static getBankAccounts() {
    return db.select().from(bankAccounts).all()
  }

  static getBankAccountById(id: number) {
    return db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).get()
  }

  static createBankAccount(data: typeof bankAccounts.$inferInsert) {
    return db.insert(bankAccounts).values({
      ...data,
      created_at: new Date().toISOString(),
    }).run()
  }

  static updateBankAccount(id: number, data: Partial<typeof bankAccounts.$inferInsert>) {
    return db.update(bankAccounts).set(data).where(eq(bankAccounts.id, id)).run()
  }

  static deleteBankAccount(id: number) {
    return db.delete(bankAccounts).where(eq(bankAccounts.id, id)).run()
  }

  static getBankTransactions(accountId: number, startDate?: string, endDate?: string) {
    const conditions = [eq(bankTransactions.bank_account_id, accountId)]
    if (startDate) conditions.push(gte(bankTransactions.tgl, startDate))
    if (endDate) conditions.push(lte(bankTransactions.tgl, endDate))
    return db.select().from(bankTransactions)
      .where(and(...conditions))
      .orderBy(desc(bankTransactions.tgl))
      .all()
  }

  static addBankTransaction(data: typeof bankTransactions.$inferInsert) {
    const result = db.insert(bankTransactions).values({
      ...data,
      created_at: new Date().toISOString(),
    }).run()

    const account = this.getBankAccountById(data.bank_account_id)
    if (account) {
      const saldoSaatIni = account.saldo_saat_ini || 0
      const jumlah = data.jumlah || 0
      const newBalance = data.jenis === 'DEBIT'
        ? saldoSaatIni + jumlah
        : saldoSaatIni - jumlah
      this.updateBankAccount(data.bank_account_id, { saldo_saat_ini: newBalance })
    }

    return result
  }

  static reconcile(accountId: number, month: number, year: number, saldo_bank: number, dibuat_oleh?: string) {
    const transactions = db.select().from(bankTransactions)
      .where(and(
        eq(bankTransactions.bank_account_id, accountId),
        eq(bankTransactions.is_reconciled, 0),
      )).all()

    const account = this.getBankAccountById(accountId)
    const saldo_buku = account?.saldo_saat_ini || 0
    const selisih = saldo_bank - saldo_buku

    return db.insert(reconciliation).values({
      bank_account_id: accountId,
      periode_bulan: month,
      periode_tahun: year,
      saldo_buku,
      saldo_bank,
      selisih,
      status: selisih === 0 ? 'COCOK' : 'TIDAK_COCOK',
      tgl_rekonsiliasi: new Date().toISOString(),
      dibuat_oleh: dibuat_oleh || null,
      created_at: new Date().toISOString(),
    }).run()
  }

  // ─── Fixed Assets ────────────────────────────────────────────────
  static getAssets(status?: string) {
    const query = db.select().from(fixedAssets)
    if (status) {
      return query.where(eq(fixedAssets.status, status)).orderBy(desc(fixedAssets.created_at)).all()
    }
    return query.orderBy(desc(fixedAssets.created_at)).all()
  }

  static getAssetById(id: number) {
    return db.select().from(fixedAssets).where(eq(fixedAssets.id, id)).get()
  }

  static createAsset(data: typeof fixedAssets.$inferInsert) {
    return db.insert(fixedAssets).values({
      ...data,
      nilai_buku: data.harga_perolehan || 0,
      created_at: new Date().toISOString(),
    }).run()
  }

  static updateAsset(id: number, data: Partial<typeof fixedAssets.$inferInsert>) {
    return db.update(fixedAssets).set({
      ...data,
      updated_at: new Date().toISOString(),
    }).where(eq(fixedAssets.id, id)).run()
  }

  static deleteAsset(id: number) {
    db.delete(assetDepreciation).where(eq(assetDepreciation.asset_id, id)).run()
    return db.delete(fixedAssets).where(eq(fixedAssets.id, id)).run()
  }

  static calculateDepreciation(assetId: number) {
    const asset = this.getAssetById(assetId)
    if (!asset) return null

    const hargaPerolehan = asset.harga_perolehan || 0
    const nilaiResidu = asset.nilai_residu || 0
    const masaManfaat = asset.masa_manfaat_tahun || 5
    const akumulasi = asset.akumulasi_penyusutan || 0
    const metode = asset.metode_penyusutan || 'GARIS_LURUS'

    const nilaiDisusutkan = hargaPerolehan - nilaiResidu
    const bebanPerTahun = nilaiDisusutkan / masaManfaat
    const bebanPerBulan = bebanPerTahun / 12

    const now = new Date()
    const periodeBulan = now.getMonth() + 1
    const periodeTahun = now.getFullYear()

    const penyusutan = metode === 'GARIS_LURUS' ? bebanPerBulan : (nilaiDisusutkan - akumulasi) * (2 / masaManfaat) / 12
    const bebanPenyusutan = Math.max(penyusutan, 0)
    const akumulasiBaru = akumulasi + bebanPenyusutan
    const nilaiAkhir = Math.max(hargaPerolehan - akumulasiBaru, nilaiResidu)

    db.insert(assetDepreciation).values({
      asset_id: assetId,
      periode_bulan: periodeBulan,
      periode_tahun: periodeTahun,
      nilai_awal: hargaPerolehan - akumulasi,
      beban_penyusutan: bebanPenyusutan,
      akumulasi: akumulasiBaru,
      nilai_akhir: nilaiAkhir,
      tgl_dibuat: new Date().toISOString(),
    }).run()

    this.updateAsset(assetId, {
      akumulasi_penyusutan: akumulasiBaru,
      nilai_buku: nilaiAkhir,
    })

    return { beban_penyusutan: bebanPenyusutan, akumulasi: akumulasiBaru, nilai_akhir: nilaiAkhir }
  }

  static getDepreciationHistory(assetId: number) {
    return db.select().from(assetDepreciation)
      .where(eq(assetDepreciation.asset_id, assetId))
      .orderBy(desc(assetDepreciation.periode_tahun), desc(assetDepreciation.periode_bulan))
      .all()
  }

  // ─── Budgets ─────────────────────────────────────────────────────
  static getBudgets(month?: number, year?: number) {
    const conditions: any[] = []
    if (month !== undefined) conditions.push(eq(budgets.periode_bulan, month))
    if (year !== undefined) conditions.push(eq(budgets.periode_tahun, year))
    if (conditions.length) {
      return db.select().from(budgets).where(and(...conditions)).all()
    }
    return db.select().from(budgets).all()
  }

  static getBudgetById(id: number) {
    return db.select().from(budgets).where(eq(budgets.id, id)).get()
  }

  static createBudget(data: typeof budgets.$inferInsert) {
    return db.insert(budgets).values({
      ...data,
      created_at: new Date().toISOString(),
    }).run()
  }

  static updateBudget(id: number, data: Partial<typeof budgets.$inferInsert>) {
    return db.update(budgets).set({
      ...data,
      updated_at: new Date().toISOString(),
    }).where(eq(budgets.id, id)).run()
  }

  static deleteBudget(id: number) {
    return db.delete(budgets).where(eq(budgets.id, id)).run()
  }

  static getBudgetSummary(year: number) {
    const allBudgets = db.select().from(budgets)
      .where(eq(budgets.periode_tahun, year))
      .all()

    const summary: Record<string, { anggaran: number; terealisasi: number; selisih: number }> = {}

    for (const b of allBudgets) {
      const kategori = b.kategori || 'LAINNYA'
      if (!summary[kategori]) {
        summary[kategori] = { anggaran: 0, terealisasi: 0, selisih: 0 }
      }
      summary[kategori].anggaran += (b.jumlah_anggaran || 0)
      summary[kategori].terealisasi += (b.jumlah_terealisasi || 0)
      summary[kategori].selisih += (b.selisih || 0)
    }

    return summary
  }
}
