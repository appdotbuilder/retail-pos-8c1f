
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { sql } from 'drizzle-orm';

export const getLowStockProducts = async (): Promise<Product[]> => {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(sql`${productsTable.current_stock} <= ${productsTable.min_stock_level}`)
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
};
