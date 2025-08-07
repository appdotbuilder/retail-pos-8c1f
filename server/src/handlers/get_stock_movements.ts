
import { db } from '../db';
import { stockMovementsTable, productsTable, usersTable } from '../db/schema';
import { type StockMovement } from '../schema';
import { eq } from 'drizzle-orm';

export async function getStockMovements(productId?: number): Promise<StockMovement[]> {
  try {
    // Build the base query with joins
    const baseQuery = db.select({
      id: stockMovementsTable.id,
      product_id: stockMovementsTable.product_id,
      movement_type: stockMovementsTable.movement_type,
      quantity: stockMovementsTable.quantity,
      reference_id: stockMovementsTable.reference_id,
      notes: stockMovementsTable.notes,
      created_by: stockMovementsTable.created_by,
      created_at: stockMovementsTable.created_at
    })
    .from(stockMovementsTable)
    .innerJoin(productsTable, eq(stockMovementsTable.product_id, productsTable.id))
    .innerJoin(usersTable, eq(stockMovementsTable.created_by, usersTable.id));

    // Execute different queries based on whether productId filter is needed
    const results = productId !== undefined 
      ? await baseQuery.where(eq(stockMovementsTable.product_id, productId)).execute()
      : await baseQuery.execute();

    return results;
  } catch (error) {
    console.error('Get stock movements failed:', error);
    throw error;
  }
}
