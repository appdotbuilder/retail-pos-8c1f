
import { db } from '../db';
import { salesTable, usersTable } from '../db/schema';
import { type Sale } from '../schema';
import { eq } from 'drizzle-orm';

export async function getSales(): Promise<Sale[]> {
  try {
    // Fetch sales with cashier information via join
    const results = await db.select({
      id: salesTable.id,
      transaction_id: salesTable.transaction_id,
      cashier_id: salesTable.cashier_id,
      total_amount: salesTable.total_amount,
      payment_method: salesTable.payment_method,
      payment_received: salesTable.payment_received,
      change_given: salesTable.change_given,
      created_at: salesTable.created_at
    })
    .from(salesTable)
    .leftJoin(usersTable, eq(salesTable.cashier_id, usersTable.id))
    .execute();

    // Convert numeric fields from strings to numbers
    return results.map(sale => ({
      id: sale.id,
      transaction_id: sale.transaction_id,
      cashier_id: sale.cashier_id,
      total_amount: parseFloat(sale.total_amount),
      payment_method: sale.payment_method,
      payment_received: parseFloat(sale.payment_received),
      change_given: parseFloat(sale.change_given),
      created_at: sale.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch sales:', error);
    throw error;
  }
}
