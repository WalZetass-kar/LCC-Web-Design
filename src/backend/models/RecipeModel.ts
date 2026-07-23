import { db } from '../../database/connection.js'
import { recipes, recipeIngredients } from '../../database/schema.js'
import { eq, and, desc, like, or } from 'drizzle-orm'

export class RecipeModel {
  static getAll(kategori?: string) {
    const query = db.select().from(recipes)
    if (kategori) {
      return query.where(eq(recipes.kategori, kategori)).orderBy(desc(recipes.created_at)).all()
    }
    return query.orderBy(desc(recipes.created_at)).all()
  }

  static getById(id: number) {
    return db.select().from(recipes).where(eq(recipes.id, id)).get()
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
    return db.insert(recipeIngredients).values(data).run()
  }

  static updateIngredient(id: number, data: Partial<typeof recipeIngredients.$inferInsert>) {
    return db.update(recipeIngredients).set(data).where(eq(recipeIngredients.id, id)).run()
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
