
import { db } from '../db';
import { stockMovementsTable, productsTable, usersTable } from '../db/schema';
import { type StockMovement } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getStockMovements(productId?: number): Promise<StockMovement[]> {
  try {
    // Build base query with joins
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
      .innerJoin(usersTable, eq(stockMovementsTable.created_by, usersTable.id))
      .orderBy(desc(stockMovementsTable.created_at));

    // Execute query with or without filter
    const results = productId !== undefined
      ? await baseQuery.where(eq(stockMovementsTable.product_id, productId)).execute()
      : await baseQuery.execute();

    // Map results to StockMovement schema
    return results.map(result => ({
      id: result.id,
      product_id: result.product_id,
      movement_type: result.movement_type,
      quantity: result.quantity,
      reference_id: result.reference_id,
      notes: result.notes,
      created_by: result.created_by,
      created_at: result.created_at
    }));
  } catch (error) {
    console.error('Failed to get stock movements:', error);
    throw error;
  }
}
