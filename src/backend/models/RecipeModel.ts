import { db } from '../../database/connection.js'
import { recipes, recipeIngredients, barang } from '../../database/schema.js'
import { eq, and, desc, like, or } from 'drizzle-orm'

export class RecipeModel {
  static getAll(kategori?: string) {
    const query = db.select().from(recipes)
    const list = kategori
      ? query.where(eq(recipes.kategori, kategori)).orderBy(desc(recipes.created_at)).all()
      : query.orderBy(desc(recipes.created_at)).all()

    return list.map(r => {
      let prod: any = null
      if (r.kd_barang) {
        prod = db.select().from(barang).where(eq(barang.kd_barang, r.kd_barang)).get()
      }
      const hargaJual = prod?.harga_jual ?? 0
      const biaya = r.biaya_produksi ?? 0
      const margin = hargaJual > 0 ? Math.round(((hargaJual - biaya) / hargaJual) * 100) : 0
      return {
        ...r,
        nama_barang: prod?.nama_barang,
        harga_jual: hargaJual,
        margin,
      }
    })
  }

  static getById(id: number) {
    const r = db.select().from(recipes).where(eq(recipes.id, id)).get()
    if (!r) return null
    let prod: any = null
    if (r.kd_barang) {
      prod = db.select().from(barang).where(eq(barang.kd_barang, r.kd_barang)).get()
    }
    const hargaJual = prod?.harga_jual ?? 0
    const biaya = r.biaya_produksi ?? 0
    const margin = hargaJual > 0 ? Math.round(((hargaJual - biaya) / hargaJual) * 100) : 0
    return {
      ...r,
      nama_barang: prod?.nama_barang,
      harga_jual: hargaJual,
      margin,
    }
  }

  static getByKdBarang(kd_barang: string) {
    return db.select().from(recipes).where(eq(recipes.kd_barang, kd_barang)).all()
  }

  static create(data: typeof recipes.$inferInsert) {
    return db.insert(recipes).values({
      ...data,
      created_at: new Date().toISOString(),
    }).run()
  }

  static update(id: number, data: Partial<typeof recipes.$inferInsert>) {
    return db.update(recipes).set({
      ...data,
      updated_at: new Date().toISOString(),
    }).where(eq(recipes.id, id)).run()
  }

  static delete(id: number) {
    db.delete(recipeIngredients).where(eq(recipeIngredients.recipe_id, id)).run()
    return db.delete(recipes).where(eq(recipes.id, id)).run()
  }

  static getIngredients(recipeId: number) {
    return db.select().from(recipeIngredients)
      .where(eq(recipeIngredients.recipe_id, recipeId))
      .all()
  }

  static addIngredient(data: typeof recipeIngredients.$inferInsert) {
    const sub_total = (data.qty || 0) * (data.harga_per_unit || 0)
    return db.insert(recipeIngredients).values({
      ...data,
      sub_total,
    }).run()
  }

  static updateIngredient(id: number, data: Partial<typeof recipeIngredients.$inferInsert>) {
    const updateData: any = { ...data }
    if (data.qty !== undefined || data.harga_per_unit !== undefined) {
      const qty = data.qty ?? 0
      const harga = data.harga_per_unit ?? 0
      updateData.sub_total = (qty || 0) * (harga || 0)
    }
    return db.update(recipeIngredients).set(updateData).where(eq(recipeIngredients.id, id)).run()
  }

  static deleteIngredient(id: number) {
    return db.delete(recipeIngredients).where(eq(recipeIngredients.id, id)).run()
  }

  static calculateProductionCost(recipeId: number) {
    const ingredients = db.select().from(recipeIngredients)
      .where(eq(recipeIngredients.recipe_id, recipeId))
      .all()

    const totalBiaya = ingredients.reduce((sum, ing) => sum + (ing.sub_total || 0), 0)
    const recipe = this.getById(recipeId)
    if (recipe) {
      const hasilProduksi = recipe.hasil_produksi || 1
      const biayaPerUnit = totalBiaya / hasilProduksi
      db.update(recipes).set({
        biaya_produksi: totalBiaya,
        updated_at: new Date().toISOString(),
      }).where(eq(recipes.id, recipeId)).run()
    }
    return totalBiaya
  }

  static search(query: string) {
    const term = `%${query}%`
    return db.select().from(recipes)
      .where(or(
        like(recipes.nama_resep, term),
        like(recipes.kategori, term),
        like(recipes.kd_barang, term),
      ))
      .orderBy(desc(recipes.created_at))
      .all()
  }
}
