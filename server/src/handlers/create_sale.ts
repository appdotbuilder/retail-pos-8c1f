
import { db } from '../db';
import { 
  salesTable, 
  saleItemsTable, 
  productsTable, 
  stockMovementsTable,
  usersTable 
} from '../db/schema';
import { type CreateSaleInput, type Sale } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const createSale = async (input: CreateSaleInput): Promise<Sale> => {
  try {
    // Verify cashier exists
    const cashier = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.cashier_id))
      .execute();

    if (cashier.length === 0) {
      throw new Error(`Cashier with id ${input.cashier_id} not found`);
    }

    // Verify all products exist and have sufficient stock
    for (const item of input.items) {
      const product = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, item.product_id))
        .execute();

      if (product.length === 0) {
        throw new Error(`Product with id ${item.product_id} not found`);
      }

      if (product[0].current_stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.product_id}. Available: ${product[0].current_stock}, Requested: ${item.quantity}`);
      }

      if (!product[0].is_active) {
        throw new Error(`Product with id ${item.product_id} is not active`);
      }
    }

    // Use database transaction for data consistency
    return await db.transaction(async (tx) => {
      // Calculate totals
      const totalAmount = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const changeGiven = Math.max(0, input.payment_received - totalAmount);

      // Create sale record
      const saleResult = await tx.insert(salesTable)
        .values({
          transaction_id: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          cashier_id: input.cashier_id,
          total_amount: totalAmount.toString(),
          payment_method: input.payment_method,
          payment_received: input.payment_received.toString(),
          change_given: changeGiven.toString()
        })
        .returning()
        .execute();

      const sale = saleResult[0];

      // Create sale items and update stock
      for (const item of input.items) {
        const totalPrice = item.quantity * item.unit_price;

        // Create sale item record
        await tx.insert(saleItemsTable)
          .values({
            sale_id: sale.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price.toString(),
            total_price: totalPrice.toString()
          })
          .execute();

        // Update product stock using SQL expression
        await tx.update(productsTable)
          .set({
            current_stock: sql`${productsTable.current_stock} - ${item.quantity}`
          })
          .where(eq(productsTable.id, item.product_id))
          .execute();

        // Create stock movement record
        await tx.insert(stockMovementsTable)
          .values({
            product_id: item.product_id,
            movement_type: 'out',
            quantity: -item.quantity, // Negative for outgoing stock
            reference_id: sale.id,
            notes: `Sale transaction ${sale.transaction_id}`,
            created_by: input.cashier_id
          })
          .execute();
      }

      // Return sale with numeric conversions
      return {
        ...sale,
        total_amount: parseFloat(sale.total_amount),
        payment_received: parseFloat(sale.payment_received),
        change_given: parseFloat(sale.change_given)
      };
    });

  } catch (error) {
    console.error('Sale creation failed:', error);
    throw error;
  }
};
