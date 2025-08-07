
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type Product } from '../schema';
import { eq } from 'drizzle-orm';

export async function getProducts(): Promise<Product[]> {
  try {
    // Fetch all active products with category information
    const results = await db.select()
      .from(productsTable)
      .innerJoin(categoriesTable, eq(productsTable.category_id, categoriesTable.id))
      .where(eq(productsTable.is_active, true))
      .execute();

    // Convert numeric fields back to numbers and map joined data
    return results.map(result => ({
      id: result.products.id,
      name: result.products.name,
      sku: result.products.sku,
      barcode: result.products.barcode,
      category_id: result.products.category_id,
      selling_price: parseFloat(result.products.selling_price),
      cost_price: parseFloat(result.products.cost_price),
      current_stock: result.products.current_stock,
      min_stock_level: result.products.min_stock_level,
      is_active: result.products.is_active,
      created_at: result.products.created_at,
      updated_at: result.products.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}
