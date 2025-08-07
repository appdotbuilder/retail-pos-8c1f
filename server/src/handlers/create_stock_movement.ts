
import { db } from '../db';
import { productsTable, stockMovementsTable } from '../db/schema';
import { type CreateStockMovementInput, type StockMovement } from '../schema';
import { eq } from 'drizzle-orm';

export const createStockMovement = async (input: CreateStockMovementInput): Promise<StockMovement> => {
  try {
    return await db.transaction(async (tx) => {
      // First, get the current product to validate stock levels
      const products = await tx.select()
        .from(productsTable)
        .where(eq(productsTable.id, input.product_id))
        .execute();

      if (products.length === 0) {
        throw new Error(`Product with id ${input.product_id} not found`);
      }

      const product = products[0];
      const currentStock = product.current_stock;

      // Calculate the new stock level based on movement type
      let newStock: number;
      if (input.movement_type === 'in') {
        newStock = currentStock + input.quantity;
      } else if (input.movement_type === 'out') {
        newStock = currentStock - input.quantity;
        // Validate that we don't go below zero for 'out' movements
        if (newStock < 0) {
          throw new Error(`Insufficient stock. Current stock: ${currentStock}, requested: ${input.quantity}`);
        }
      } else { // adjustment
        // For adjustments, the quantity represents the final stock level
        newStock = input.quantity;
      }

      // Create the stock movement record
      const movementResult = await tx.insert(stockMovementsTable)
        .values({
          product_id: input.product_id,
          movement_type: input.movement_type,
          quantity: input.quantity,
          reference_id: null,
          notes: input.notes,
          created_by: input.created_by
        })
        .returning()
        .execute();

      // Update the product's current stock
      await tx.update(productsTable)
        .set({ 
          current_stock: newStock,
          updated_at: new Date()
        })
        .where(eq(productsTable.id, input.product_id))
        .execute();

      const movement = movementResult[0];
      return {
        ...movement,
        created_at: movement.created_at
      };
    });
  } catch (error) {
    console.error('Stock movement creation failed:', error);
    throw error;
  }
};
