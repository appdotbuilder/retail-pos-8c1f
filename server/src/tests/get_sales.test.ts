
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, salesTable } from '../db/schema';
import { getSales } from '../handlers/get_sales';

describe('getSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sales exist', async () => {
    const result = await getSales();
    expect(result).toEqual([]);
  });

  it('should fetch sales with correct data types', async () => {
    // Create prerequisite user (cashier)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'cashier1',
        email: 'cashier@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();

    const cashierId = userResult[0].id;

    // Create test sale
    await db.insert(salesTable)
      .values({
        transaction_id: 'TXN-001',
        cashier_id: cashierId,
        total_amount: '99.50',
        payment_method: 'cash',
        payment_received: '100.00',
        change_given: '0.50'
      })
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(1);
    
    const sale = result[0];
    expect(sale.transaction_id).toEqual('TXN-001');
    expect(sale.cashier_id).toEqual(cashierId);
    expect(typeof sale.total_amount).toEqual('number');
    expect(sale.total_amount).toEqual(99.50);
    expect(typeof sale.payment_received).toEqual('number');
    expect(sale.payment_received).toEqual(100.00);
    expect(typeof sale.change_given).toEqual('number');
    expect(sale.change_given).toEqual(0.50);
    expect(sale.payment_method).toEqual('cash');
    expect(sale.id).toBeDefined();
    expect(sale.created_at).toBeInstanceOf(Date);
  });

  it('should return sales ordered by most recent first', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'cashier1',
        email: 'cashier@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();

    const cashierId = userResult[0].id;

    // Create multiple sales with slight delay to ensure different timestamps
    await db.insert(salesTable)
      .values({
        transaction_id: 'TXN-001',
        cashier_id: cashierId,
        total_amount: '50.00',
        payment_method: 'cash',
        payment_received: '50.00',
        change_given: '0.00'
      })
      .execute();

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(salesTable)
      .values({
        transaction_id: 'TXN-002',
        cashier_id: cashierId,
        total_amount: '75.00',
        payment_method: 'card',
        payment_received: '75.00',
        change_given: '0.00'
      })
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(2);
    // Most recent sale should be first
    expect(result[0].transaction_id).toEqual('TXN-002');
    expect(result[1].transaction_id).toEqual('TXN-001');
    
    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle multiple payment methods correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'cashier1',
        email: 'cashier@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();

    const cashierId = userResult[0].id;

    // Create sales with different payment methods
    await db.insert(salesTable)
      .values([
        {
          transaction_id: 'TXN-CASH',
          cashier_id: cashierId,
          total_amount: '25.00',
          payment_method: 'cash',
          payment_received: '30.00',
          change_given: '5.00'
        },
        {
          transaction_id: 'TXN-CARD',
          cashier_id: cashierId,
          total_amount: '45.00',
          payment_method: 'card',
          payment_received: '45.00',
          change_given: '0.00'
        },
        {
          transaction_id: 'TXN-DIGITAL',
          cashier_id: cashierId,
          total_amount: '35.00',
          payment_method: 'digital',
          payment_received: '35.00',
          change_given: '0.00'
        }
      ])
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(3);
    
    const paymentMethods = result.map(sale => sale.payment_method);
    expect(paymentMethods).toContain('cash');
    expect(paymentMethods).toContain('card');
    expect(paymentMethods).toContain('digital');

    // Verify change is only given for cash payments in our test data
    const cashSale = result.find(sale => sale.payment_method === 'cash');
    const cardSale = result.find(sale => sale.payment_method === 'card');
    const digitalSale = result.find(sale => sale.payment_method === 'digital');

    expect(cashSale?.change_given).toEqual(5.00);
    expect(cardSale?.change_given).toEqual(0.00);
    expect(digitalSale?.change_given).toEqual(0.00);
  });
});
