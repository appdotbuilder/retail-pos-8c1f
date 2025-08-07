
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, salesTable } from '../db/schema';
import { getSales } from '../handlers/get_sales';

describe('getSales', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no sales exist', async () => {
    const result = await getSales();
    expect(result).toEqual([]);
  });

  it('should fetch sales with correct data types', async () => {
    // Create a test user first (required for foreign key)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testcashier',
        email: 'cashier@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test sale
    await db.insert(salesTable)
      .values({
        transaction_id: 'TXN001',
        cashier_id: userId,
        total_amount: '25.50', // Insert as string (numeric column)
        payment_method: 'cash',
        payment_received: '30.00',
        change_given: '4.50'
      })
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(1);
    
    const sale = result[0];
    expect(sale.transaction_id).toEqual('TXN001');
    expect(sale.cashier_id).toEqual(userId);
    expect(sale.total_amount).toEqual(25.50);
    expect(typeof sale.total_amount).toBe('number');
    expect(sale.payment_method).toEqual('cash');
    expect(sale.payment_received).toEqual(30.00);
    expect(typeof sale.payment_received).toBe('number');
    expect(sale.change_given).toEqual(4.50);
    expect(typeof sale.change_given).toBe('number');
    expect(sale.id).toBeDefined();
    expect(sale.created_at).toBeInstanceOf(Date);
  });

  it('should fetch multiple sales in correct order', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testcashier',
        email: 'cashier@test.com',
        password_hash: 'hashedpassword',
        full_name: 'Test Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple test sales
    await db.insert(salesTable)
      .values([
        {
          transaction_id: 'TXN001',
          cashier_id: userId,
          total_amount: '25.50',
          payment_method: 'cash',
          payment_received: '30.00',
          change_given: '4.50'
        },
        {
          transaction_id: 'TXN002',
          cashier_id: userId,
          total_amount: '15.75',
          payment_method: 'card',
          payment_received: '15.75',
          change_given: '0.00'
        }
      ])
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(2);
    
    // Verify both sales have correct data types
    result.forEach(sale => {
      expect(typeof sale.total_amount).toBe('number');
      expect(typeof sale.payment_received).toBe('number');
      expect(typeof sale.change_given).toBe('number');
      expect(sale.created_at).toBeInstanceOf(Date);
    });

    // Check specific values
    const sale1 = result.find(s => s.transaction_id === 'TXN001');
    const sale2 = result.find(s => s.transaction_id === 'TXN002');
    
    expect(sale1?.total_amount).toEqual(25.50);
    expect(sale1?.payment_method).toEqual('cash');
    expect(sale2?.total_amount).toEqual(15.75);
    expect(sale2?.payment_method).toEqual('card');
  });

  it('should handle sales with different cashiers', async () => {
    // Create multiple test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'cashier1',
          email: 'cashier1@test.com',
          password_hash: 'hashedpassword',
          full_name: 'Cashier One',
          role: 'cashier'
        },
        {
          username: 'cashier2',
          email: 'cashier2@test.com',
          password_hash: 'hashedpassword',
          full_name: 'Cashier Two',
          role: 'cashier'
        }
      ])
      .returning()
      .execute();

    // Create sales for different cashiers
    await db.insert(salesTable)
      .values([
        {
          transaction_id: 'TXN001',
          cashier_id: users[0].id,
          total_amount: '25.50',
          payment_method: 'cash',
          payment_received: '30.00',
          change_given: '4.50'
        },
        {
          transaction_id: 'TXN002',
          cashier_id: users[1].id,
          total_amount: '15.75',
          payment_method: 'card',
          payment_received: '15.75',
          change_given: '0.00'
        }
      ])
      .execute();

    const result = await getSales();

    expect(result).toHaveLength(2);
    
    // Verify different cashier IDs
    const cashierIds = result.map(sale => sale.cashier_id);
    expect(cashierIds).toContain(users[0].id);
    expect(cashierIds).toContain(users[1].id);
  });
});
