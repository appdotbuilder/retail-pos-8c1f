
import { db } from '../db';
import { productsTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateProduct(input: UpdateProductInput): Promise<Product> {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.sku !== undefined) {
      updateData.sku = input.sku;
    }
    if (input.barcode !== undefined) {
      updateData.barcode = input.barcode;
    }
    if (input.category_id !== undefined) {
      updateData.category_id = input.category_id;
    }
    if (input.selling_price !== undefined) {
      updateData.selling_price = input.selling_price.toString();
    }
    if (input.cost_price !== undefined) {
      updateData.cost_price = input.cost_price.toString();
    }
    if (input.min_stock_level !== undefined) {
      updateData.min_stock_level = input.min_stock_level;
    }

    // Update product record
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Product with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      selling_price: parseFloat(product.selling_price),
      cost_price: parseFloat(product.cost_price)
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
}
