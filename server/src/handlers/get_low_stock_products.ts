
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { lte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function getLowStockProducts(): Promise<Product[]> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(lte(productsTable.current_stock, sql`${productsTable.min_stock_level}`))
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      selling_price: parseFloat(product.selling_price),
      cost_price: parseFloat(product.cost_price)
    }));
  } catch (error) {
    console.error('Failed to fetch low stock products:', error);
    throw error;
  }
}
