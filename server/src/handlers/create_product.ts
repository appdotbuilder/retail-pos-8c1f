
import { db } from '../db';
import { productsTable, stockMovementsTable } from '../db/schema';
import { type CreateProductInput, type Product } from '../schema';

export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    // Start a transaction to ensure both product and stock movement are created atomically
    return await db.transaction(async (tx) => {
      // Insert product record
      const productResult = await tx.insert(productsTable)
        .values({
          name: input.name,
          sku: input.sku,
          barcode: input.barcode,
          category_id: input.category_id,
          selling_price: input.selling_price.toString(),
          cost_price: input.cost_price.toString(),
          current_stock: input.initial_stock,
          min_stock_level: input.min_stock_level
        })
        .returning()
        .execute();

      const product = productResult[0];

      // Create initial stock movement record if there's initial stock
      if (input.initial_stock > 0) {
        await tx.insert(stockMovementsTable)
          .values({
            product_id: product.id,
            movement_type: 'in',
            quantity: input.initial_stock,
            notes: 'Initial stock',
            created_by: 1 // Using 1 as default system user for initial stock
          })
          .execute();
      }

      // Convert numeric fields back to numbers before returning
      return {
        ...product,
        selling_price: parseFloat(product.selling_price),
        cost_price: parseFloat(product.cost_price)
      };
    });
  } catch (error) {
    console.error('Product creation failed:', error);
    throw error;
  }
}
