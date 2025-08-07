
import { db } from '../db';
import { salesTable, saleItemsTable, productsTable, stockMovementsTable } from '../db/schema';
import { type CreateSaleInput, type Sale } from '../schema';
import { eq } from 'drizzle-orm';

export const createSale = async (input: CreateSaleInput): Promise<Sale> => {
  try {
    return await db.transaction(async (tx) => {
      // Calculate total amount
      const totalAmount = input.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const changeGiven = Math.max(0, input.payment_received - totalAmount);
      
      // Generate unique transaction ID
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create sale record
      const saleResult = await tx.insert(salesTable)
        .values({
          transaction_id: transactionId,
          cashier_id: input.cashier_id,
          total_amount: totalAmount.toString(),
          payment_method: input.payment_method,
          payment_received: input.payment_received.toString(),
          change_given: changeGiven.toString()
        })
        .returning()
        .execute();

      const sale = saleResult[0];
      
      // Process each sale item
      for (const item of input.items) {
        // Verify product exists and has sufficient stock
        const productResult = await tx.select()
          .from(productsTable)
          .where(eq(productsTable.id, item.product_id))
          .execute();
        
        if (productResult.length === 0) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }
        
        const product = productResult[0];
        if (product.current_stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.current_stock}, Required: ${item.quantity}`);
        }
        
        // Create sale item record
        const totalPrice = item.quantity * item.unit_price;
        await tx.insert(saleItemsTable)
          .values({
            sale_id: sale.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price.toString(),
            total_price: totalPrice.toString()
          })
          .execute();
        
        // Update product stock
        await tx.update(productsTable)
          .set({
            current_stock: product.current_stock - item.quantity,
            updated_at: new Date()
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
            notes: `Sale transaction ${transactionId}`,
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
