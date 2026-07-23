import { FinanceModel } from '../models/FinanceModel.js'
import { requireAuth } from '../utils/authGuard.js'

export class FinanceController {
  // ─── Bank Accounts ───────────────────────────────────────────────
  static getBankAccounts() {
    try {
      const data = FinanceModel.getBankAccounts()
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data bank: ' + (error as Error).message }
    }
  }

  static getBankAccountById(id: number) {
    try {
      const data = FinanceModel.getBankAccountById(id)
      if (!data) {
        return { success: false, message: 'Rekening bank tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data bank: ' + (error as Error).message }
    }
  }

  static async createBankAccount(data: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      FinanceModel.createBankAccount(data as any)
      return { success: true, message: 'Rekening bank berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan rekening: ' + (error as Error).message }
    }
  }

  static async updateBankAccount(id: number, data: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const account = FinanceModel.getBankAccountById(id)
      if (!account) {
        return { success: false, message: 'Rekening bank tidak ditemukan' }
      }
      FinanceModel.updateBankAccount(id, data as any)
      return { success: true, message: 'Rekening bank berhasil diupdate' }
    } catch (error) {
      return { success: false, message: 'Gagal mengupdate rekening: ' + (error as Error).message }
    }
  }

  static async deleteBankAccount(id: number, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const account = FinanceModel.getBankAccountById(id)
      if (!account) {
        return { success: false, message: 'Rekening bank tidak ditemukan' }
      }
      FinanceModel.deleteBankAccount(id)
      return { success: true, message: 'Rekening bank berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus rekening: ' + (error as Error).message }
    }
  }

  static getBankTransactions(accountId: number, startDate?: string, endDate?: string) {
    try {
      const data = FinanceModel.getBankTransactions(accountId, startDate, endDate)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil transaksi bank: ' + (error as Error).message }
    }
  }

  static async addBankTransaction(data: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      FinanceModel.addBankTransaction(data as any)
      return { success: true, message: 'Transaksi bank berhasil dicatat' }
    } catch (error) {
      return { success: false, message: 'Gagal mencatat transaksi: ' + (error as Error).message }
    }
  }

  static async reconcile(accountId: number, month: number, year: number, saldo_bank: number, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      FinanceModel.reconcile(accountId, month, year, saldo_bank, username)
      return { success: true, message: 'Rekonsiliasi berhasil dilakukan' }
    } catch (error) {
      return { success: false, message: 'Gagal melakukan rekonsiliasi: ' + (error as Error).message }
    }
  }

  // ─── Fixed Assets ────────────────────────────────────────────────
  static getAssets(status?: string) {
    try {
      const data = FinanceModel.getAssets(status)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data aset: ' + (error as Error).message }
    }
  }

  static getAssetById(id: number) {
    try {
      const data = FinanceModel.getAssetById(id)
      if (!data) {
        return { success: false, message: 'Aset tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data aset: ' + (error as Error).message }
    }
  }

  static async createAsset(data: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      FinanceModel.createAsset(data as any)
      return { success: true, message: 'Aset berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan aset: ' + (error as Error).message }
    }
  }

  static async updateAsset(id: number, data: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const asset = FinanceModel.getAssetById(id)
      if (!asset) {
        return { success: false, message: 'Aset tidak ditemukan' }
      }
      FinanceModel.updateAsset(id, data as any)
      return { success: true, message: 'Aset berhasil diupdate' }
    } catch (error) {
      return { success: false, message: 'Gagal mengupdate aset: ' + (error as Error).message }
    }
  }

  static async deleteAsset(id: number, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const asset = FinanceModel.getAssetById(id)
      if (!asset) {
        return { success: false, message: 'Aset tidak ditemukan' }
      }
      FinanceModel.deleteAsset(id)
      return { success: true, message: 'Aset berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus aset: ' + (error as Error).message }
    }
  }

  static calculateDepreciation(assetId: number) {
    try {
      const asset = FinanceModel.getAssetById(assetId)
      if (!asset) {
        return { success: false, message: 'Aset tidak ditemukan' }
      }
      const result = FinanceModel.calculateDepreciation(assetId)
      return { success: true, data: result }
    } catch (error) {
      return { success: false, message: 'Gagal menghitung penyusutan: ' + (error as Error).message }
    }
  }

  static getDepreciationHistory(assetId: number) {
    try {
      const data = FinanceModel.getDepreciationHistory(assetId)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil riwayat penyusutan: ' + (error as Error).message }
    }
  }

  // ─── Budgets ─────────────────────────────────────────────────────
  static getBudgets(month?: number, year?: number) {
    try {
      const data = FinanceModel.getBudgets(month, year)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data anggaran: ' + (error as Error).message }
    }
  }

  static getBudgetById(id: number) {
    try {
      const data = FinanceModel.getBudgetById(id)
      if (!data) {
        return { success: false, message: 'Anggaran tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data anggaran: ' + (error as Error).message }
    }
  }

  static async createBudget(data: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      FinanceModel.createBudget({ ...data, dibuat_oleh: username } as any)
      return { success: true, message: 'Anggaran berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan anggaran: ' + (error as Error).message }
    }
  }

  static async updateBudget(id: number, data: Record<string, any>, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const budget = FinanceModel.getBudgetById(id)
      if (!budget) {
        return { success: false, message: 'Anggaran tidak ditemukan' }
      }
      FinanceModel.updateBudget(id, data as any)
      return { success: true, message: 'Anggaran berhasil diupdate' }
    } catch (error) {
      return { success: false, message: 'Gagal mengupdate anggaran: ' + (error as Error).message }
    }
  }

  static async deleteBudget(id: number, username?: string) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
      const budget = FinanceModel.getBudgetById(id)
      if (!budget) {
        return { success: false, message: 'Anggaran tidak ditemukan' }
      }
      FinanceModel.deleteBudget(id)
      return { success: true, message: 'Anggaran berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus anggaran: ' + (error as Error).message }
    }
  }

  static getBudgetSummary(year: number) {
    try {
      const data = FinanceModel.getBudgetSummary(year)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil ringkasan anggaran: ' + (error as Error).message }
    }
  }
}
