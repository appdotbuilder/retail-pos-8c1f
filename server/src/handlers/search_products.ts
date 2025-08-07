
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type SearchProductInput, type Product } from '../schema';
import { eq, or, ilike, and } from 'drizzle-orm';

export async function searchProducts(input: SearchProductInput): Promise<Product[]> {
  try {
    // Build conditions array
    const conditions = [];

    // Always filter for active products only
    conditions.push(eq(productsTable.is_active, true));

    // Add search conditions (fuzzy matching on name, SKU, and barcode)
    const searchPattern = `%${input.query}%`;
    const searchConditions = [
      ilike(productsTable.name, searchPattern),
      ilike(productsTable.sku, searchPattern),
      ilike(productsTable.barcode, searchPattern)
    ];

    conditions.push(or(...searchConditions)!);

    // Add category filter if provided
    if (input.category_id !== undefined) {
      conditions.push(eq(productsTable.category_id, input.category_id));
    }

    // Execute query with all conditions
    const results = await db.select()
      .from(productsTable)
      .where(and(...conditions)!)
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
