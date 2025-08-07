
import { db } from '../db';
import { stockMovementsTable, productsTable } from '../db/schema';
import { type CreateStockMovementInput, type StockMovement } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function createStockMovement(input: CreateStockMovementInput): Promise<StockMovement> {
  try {
    return await db.transaction(async (tx) => {
      // First, check if the product exists
      const product = await tx.select()
        .from(productsTable)
        .where(eq(productsTable.id, input.product_id))
        .limit(1)
        .execute();

      if (product.length === 0) {
        throw new Error(`Product with id ${input.product_id} not found`);
      }

      const currentStock = product[0].current_stock;

      // For 'out' movements, validate sufficient stock
      if (input.movement_type === 'out' && currentStock < input.quantity) {
        throw new Error(`Insufficient stock. Current: ${currentStock}, Requested: ${input.quantity}`);
      }

      // Calculate new stock level
      let newStockLevel = currentStock;
      if (input.movement_type === 'in') {
        newStockLevel = currentStock + input.quantity;
      } else if (input.movement_type === 'out') {
        newStockLevel = currentStock - input.quantity;
      } else if (input.movement_type === 'adjustment') {
        // For adjustment, quantity is the final amount, not a delta
        newStockLevel = input.quantity;
      }

      // Create stock movement record
      const stockMovementResult = await tx.insert(stockMovementsTable)
        .values({
          product_id: input.product_id,
          movement_type: input.movement_type,
          quantity: input.quantity,
          notes: input.notes,
          created_by: input.created_by
        })
        .returning()
        .execute();

      // Update product stock level
      await tx.update(productsTable)
        .set({
          current_stock: newStockLevel,
          updated_at: sql`now()`
        })
        .where(eq(productsTable.id, input.product_id))
        .execute();

      const stockMovement = stockMovementResult[0];
      return {
        ...stockMovement,
        reference_id: stockMovement.reference_id || null
      };
    });
  } catch (error) {
    console.error('Stock movement creation failed:', error);
    throw error;
  }
}
