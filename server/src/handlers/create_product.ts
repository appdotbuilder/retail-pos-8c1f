
import { db } from '../db';
import { productsTable, stockMovementsTable, categoriesTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    // Verify category exists
    const categoryExists = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, input.category_id))
      .execute();
    
    if (categoryExists.length === 0) {
      throw new Error(`Category with id ${input.category_id} does not exist`);
    }

    // Insert product record
    const productResult = await db.insert(productsTable)
      .values({
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        category_id: input.category_id,
        selling_price: input.selling_price.toString(),
        cost_price: input.cost_price.toString(),
        current_stock: input.initial_stock,
        min_stock_level: input.min_stock_level,
        is_active: true
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Create initial stock movement record if there's initial stock
    if (input.initial_stock > 0) {
      await db.insert(stockMovementsTable)
        .values({
          product_id: product.id,
          movement_type: 'in',
          quantity: input.initial_stock,
          notes: 'Initial stock',
          created_by: 1 // Default system user - in real app this would come from auth context
        })
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    return {
      ...product,
      selling_price: parseFloat(product.selling_price),
      cost_price: parseFloat(product.cost_price)
    };
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
}
