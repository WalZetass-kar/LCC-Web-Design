import { RecipeModel } from '../models/RecipeModel.js'
import { requireAuth } from '../utils/authGuard.js'

export class RecipeController {
  static getAll(kategori?: string) {
    try {
      const data = RecipeModel.getAll(kategori)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data resep: ' + (error as Error).message }
    }
  }

  static getById(id: number) {
    try {
      const data = RecipeModel.getById(id)
      if (!data) {
        return { success: false, message: 'Resep tidak ditemukan' }
      }
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil data resep: ' + (error as Error).message }
    }
  }

  static async create(data: Record<string, any>, username?: string) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
      RecipeModel.create(data as any)
      return { success: true, message: 'Resep berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan resep: ' + (error as Error).message }
    }
  }

  static async update(id: number, data: Record<string, any>, username?: string) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
      const recipe = RecipeModel.getById(id)
      if (!recipe) {
        return { success: false, message: 'Resep tidak ditemukan' }
      }
      RecipeModel.update(id, data as any)
      return { success: true, message: 'Resep berhasil diupdate' }
    } catch (error) {
      return { success: false, message: 'Gagal mengupdate resep: ' + (error as Error).message }
    }
  }

  static async delete(id: number, username?: string) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
      const recipe = RecipeModel.getById(id)
      if (!recipe) {
        return { success: false, message: 'Resep tidak ditemukan' }
      }
      RecipeModel.delete(id)
      return { success: true, message: 'Resep berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus resep: ' + (error as Error).message }
    }
  }

  static getIngredients(recipeId: number) {
    try {
      const data = RecipeModel.getIngredients(recipeId)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil bahan resep: ' + (error as Error).message }
    }
  }

  static async addIngredient(data: Record<string, any>, username?: string) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
      RecipeModel.addIngredient(data as any)
      RecipeModel.calculateProductionCost(data.recipe_id)
      return { success: true, message: 'Bahan berhasil ditambahkan' }
    } catch (error) {
      return { success: false, message: 'Gagal menambahkan bahan: ' + (error as Error).message }
    }
  }

  static async updateIngredient(id: number, data: Record<string, any>, username?: string) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
      RecipeModel.updateIngredient(id, data as any)
      if (data.recipe_id) {
        RecipeModel.calculateProductionCost(data.recipe_id)
      }
      return { success: true, message: 'Bahan berhasil diupdate' }
    } catch (error) {
      return { success: false, message: 'Gagal mengupdate bahan: ' + (error as Error).message }
    }
  }

  static async deleteIngredient(id: number, recipeId: number, username?: string) {
    const authError = await requireAuth()
    if (authError) return authError

    try {
      RecipeModel.deleteIngredient(id)
      RecipeModel.calculateProductionCost(recipeId)
      return { success: true, message: 'Bahan berhasil dihapus' }
    } catch (error) {
      return { success: false, message: 'Gagal menghapus bahan: ' + (error as Error).message }
    }
  }

  static calculateProductionCost(recipeId: number) {
    try {
      const total = RecipeModel.calculateProductionCost(recipeId)
      return { success: true, data: { total_biaya_produksi: total } }
    } catch (error) {
      return { success: false, message: 'Gagal menghitung biaya produksi: ' + (error as Error).message }
    }
  }

  static search(query: string) {
    try {
      const data = RecipeModel.search(query)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mencari resep: ' + (error as Error).message }
    }
  }

  static getByKdBarang(kd_barang: string) {
    try {
      const data = RecipeModel.getByKdBarang(kd_barang)
      return { success: true, data }
    } catch (error) {
      return { success: false, message: 'Gagal mengambil resep: ' + (error as Error).message }
    }
  }
}
