
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type SearchProductInput, type Product } from '../schema';
import { eq, or, ilike, and } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';

export async function searchProducts(input: SearchProductInput): Promise<Product[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Add text search conditions (fuzzy matching with ILIKE)
    const searchConditions: SQL<unknown>[] = [
      ilike(productsTable.name, `%${input.query}%`),
      ilike(productsTable.sku, `%${input.query}%`)
    ];

    // Add barcode search condition
    searchConditions.push(ilike(productsTable.barcode, `%${input.query}%`));

    // Add the OR condition for text search
    conditions.push(or(...searchConditions)!);

    // Filter by category if provided
    if (input.category_id !== undefined) {
      conditions.push(eq(productsTable.category_id, input.category_id));
    }

    // Only show active products
    conditions.push(eq(productsTable.is_active, true));

    // Execute query with all conditions
    const results = await db.select()
      .from(productsTable)
      .where(and(...conditions))
      .limit(input.limit)
      .execute();

    // Convert numeric fields back to numbers
    return results.map(product => ({
      ...product,
      selling_price: parseFloat(product.selling_price),
      cost_price: parseFloat(product.cost_price)
    }));
  } catch (error) {
    console.error('Product search failed:', error);
    throw error;
  }
}
