
import { db } from '../db';
import { salesTable, usersTable, saleItemsTable, productsTable } from '../db/schema';
import { type Sale } from '../schema';
import { desc } from 'drizzle-orm';

export const getSales = async (): Promise<Sale[]> => {
  try {
    // Get recent sales with basic info, ordered by most recent first
    const results = await db.select()
      .from(salesTable)
      .orderBy(desc(salesTable.created_at))
      .limit(50) // Default limit to recent sales
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(sale => ({
      ...sale,
      total_amount: parseFloat(sale.total_amount),
      payment_received: parseFloat(sale.payment_received),
      change_given: parseFloat(sale.change_given)
    }));
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    throw error;
  }
};
