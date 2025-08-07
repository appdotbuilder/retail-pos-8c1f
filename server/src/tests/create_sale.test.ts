
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  salesTable, 
  saleItemsTable, 
  productsTable, 
  stockMovementsTable,
  usersTable,
  categoriesTable 
} from '../db/schema';
import { type CreateSaleInput } from '../schema';
import { createSale } from '../handlers/create_sale';
import { eq } from 'drizzle-orm';

describe('createSale', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let cashierId: number;
  let categoryId: number;
  let productId1: number;
  let productId2: number;

  beforeEach(async () => {
    // Create test user (cashier)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testcashier',
        email: 'cashier@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();
    cashierId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 1',
        sku: 'TEST001',
        category_id: categoryId,
        selling_price: '10.00',
        cost_price: '5.00',
        current_stock: 100,
        min_stock_level: 10
      })
      .returning()
      .execute();
    productId1 = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 2',
        sku: 'TEST002',
        category_id: categoryId,
        selling_price: '20.00',
        cost_price: '10.00',
        current_stock: 50,
        min_stock_level: 5
      })
      .returning()
      .execute();
    productId2 = product2Result[0].id;
  });

  it('should create a sale with single item', async () => {
    const testInput: CreateSaleInput = {
      cashier_id: cashierId,
      payment_method: 'cash',
      payment_received: 15.00,
      items: [{
        product_id: productId1,
        quantity: 1,
        unit_price: 10.00
      }]
    };

    const result = await createSale(testInput);

    expect(result.cashier_id).toBe(cashierId);
    expect(result.total_amount).toBe(10.00);
    expect(result.payment_method).toBe('cash');
    expect(result.payment_received).toBe(15.00);
    expect(result.change_given).toBe(5.00);
    expect(result.transaction_id).toMatch(/^TXN-/);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a sale with multiple items', async () => {
    const testInput: CreateSaleInput = {
      cashier_id: cashierId,
      payment_method: 'card',
      payment_received: 50.00,
      items: [
        {
          product_id: productId1,
          quantity: 2,
          unit_price: 10.00
        },
        {
          product_id: productId2,
          quantity: 1,
          unit_price: 20.00
        }
      ]
    };

    const result = await createSale(testInput);

    expect(result.total_amount).toBe(40.00);
    expect(result.payment_received).toBe(50.00);
    expect(result.change_given).toBe(10.00);
    expect(result.payment_method).toBe('card');
  });

  it('should create sale items in database', async () => {
    const testInput: CreateSaleInput = {
      cashier_id: cashierId,
      payment_method: 'cash',
      payment_received: 30.00,
      items: [
        {
          product_id: productId1,
          quantity: 2,
          unit_price: 10.00
        }
      ]
    };

    const result = await createSale(testInput);

    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.sale_id, result.id))
      .execute();

    expect(saleItems).toHaveLength(1);
    expect(saleItems[0].product_id).toBe(productId1);
    expect(saleItems[0].quantity).toBe(2);
    expect(parseFloat(saleItems[0].unit_price)).toBe(10.00);
    expect(parseFloat(saleItems[0].total_price)).toBe(20.00);
  });

  it('should update product stock quantities', async () => {
    const testInput: CreateSaleInput = {
      cashier_id: cashierId,
      payment_method: 'cash',
      payment_received: 50.00,
      items: [
        {
          product_id: productId1,
          quantity: 5,
          unit_price: 10.00
        }
      ]
    };

    await createSale(testInput);

    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId1))
      .execute();

    expect(product[0].current_stock).toBe(95); // 100 - 5
  });

  it('should create stock movement records', async () => {
    const testInput: CreateSaleInput = {
      cashier_id: cashierId,
      payment_method: 'cash',
      payment_received: 30.00,
      items: [
        {
          product_id: productId1,
          quantity: 3,
          unit_price: 10.00
        }
      ]
    };

    const result = await createSale(testInput);

    const stockMovements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.reference_id, result.id))
      .execute();

    expect(stockMovements).toHaveLength(1);
    expect(stockMovements[0].product_id).toBe(productId1);
    expect(stockMovements[0].movement_type).toBe('out');
    expect(stockMovements[0].quantity).toBe(-3);
    expect(stockMovements[0].created_by).toBe(cashierId);
    expect(stockMovements[0].notes).toMatch(/Sale transaction/);
  });

  it('should handle exact payment amount', async () => {
    const testInput: CreateSaleInput = {
      cashier_id: cashierId,
      payment_method: 'card',
      payment_received: 20.00,
      items: [
        {
          product_id: productId2,
          quantity: 1,
          unit_price: 20.00
        }
      ]
    };

    const result = await createSale(testInput);

    expect(result.change_given).toBe(0.00);
  });

  it('should throw error for non-existent cashier', async () => {
    const testInput: CreateSaleInput = {
      cashier_id: 99999,
      payment_method: 'cash',
      payment_received: 15.00,
      items: [{
        product_id: productId1,
        quantity: 1,
        unit_price: 10.00
      }]
    };

    expect(createSale(testInput)).rejects.toThrow(/cashier.*not found/i);
  });

  it('should throw error for non-existent product', async () => {
    const testInput: CreateSaleInput = {
      cashier_id: cashierId,
      payment_method: 'cash',
      payment_received: 15.00,
      items: [{
        product_id: 99999,
        quantity: 1,
        unit_price: 10.00
      }]
    };

    expect(createSale(testInput)).rejects.toThrow(/product.*not found/i);
  });

  it('should throw error for insufficient stock', async () => {
    const testInput: CreateSaleInput = {
      cashier_id: cashierId,
      payment_method: 'cash',
      payment_received: 200.00,
      items: [{
        product_id: productId1,
        quantity: 150, // More than available stock (100)
        unit_price: 10.00
      }]
    };

    expect(createSale(testInput)).rejects.toThrow(/insufficient stock/i);
  });

  it('should throw error for inactive product', async () => {
    // Make product inactive
    await db.update(productsTable)
      .set({ is_active: false })
      .where(eq(productsTable.id, productId1))
      .execute();

    const testInput: CreateSaleInput = {
      cashier_id: cashierId,
      payment_method: 'cash',
      payment_received: 15.00,
      items: [{
        product_id: productId1,
        quantity: 1,
        unit_price: 10.00
      }]
    };

    expect(createSale(testInput)).rejects.toThrow(/not active/i);
  });
});
