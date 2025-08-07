
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, salesTable, saleItemsTable, stockMovementsTable } from '../db/schema';
import { type CreateSaleInput } from '../schema';
import { createSale } from '../handlers/create_sale';
import { eq } from 'drizzle-orm';

describe('createSale', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCashierId: number;
  let testCategoryId: number;
  let testProductId1: number;
  let testProductId2: number;

  beforeEach(async () => {
    // Create test cashier
    const cashierResult = await db.insert(usersTable)
      .values({
        username: 'cashier1',
        email: 'cashier1@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Cashier',
        role: 'cashier',
        is_active: true
      })
      .returning()
      .execute();
    testCashierId = cashierResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 1',
        sku: 'TEST001',
        category_id: testCategoryId,
        selling_price: '10.00',
        cost_price: '5.00',
        current_stock: 100,
        min_stock_level: 10,
        is_active: true
      })
      .returning()
      .execute();
    testProductId1 = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Test Product 2',
        sku: 'TEST002',
        category_id: testCategoryId,
        selling_price: '15.50',
        cost_price: '8.00',
        current_stock: 50,
        min_stock_level: 5,
        is_active: true
      })
      .returning()
      .execute();
    testProductId2 = product2Result[0].id;
  });

  const createTestSaleInput = (): CreateSaleInput => ({
    cashier_id: testCashierId,
    payment_method: 'cash',
    payment_received: 30.00,
    items: [
      {
        product_id: testProductId1,
        quantity: 2,
        unit_price: 10.00
      },
      {
        product_id: testProductId2,
        quantity: 1,
        unit_price: 8.00
      }
    ]
  });

  it('should create a sale with correct totals', async () => {
    const input = createTestSaleInput();
    const result = await createSale(input);

    expect(result.cashier_id).toEqual(testCashierId);
    expect(result.payment_method).toEqual('cash');
    expect(result.payment_received).toEqual(30.00);
    expect(result.total_amount).toEqual(28.00); // (2 * 10.00) + (1 * 8.00)
    expect(result.change_given).toEqual(2.00); // 30.00 - 28.00
    expect(result.id).toBeDefined();
    expect(result.transaction_id).toMatch(/^TXN-\d+-[a-z0-9]+$/);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toBe('number');
    expect(typeof result.payment_received).toBe('number');
    expect(typeof result.change_given).toBe('number');
  });

  it('should create sale items correctly', async () => {
    const input = createTestSaleInput();
    const result = await createSale(input);

    const saleItems = await db.select()
      .from(saleItemsTable)
      .where(eq(saleItemsTable.sale_id, result.id))
      .execute();

    expect(saleItems).toHaveLength(2);

    const item1 = saleItems.find(item => item.product_id === testProductId1);
    const item2 = saleItems.find(item => item.product_id === testProductId2);

    expect(item1).toBeDefined();
    expect(item1!.quantity).toEqual(2);
    expect(parseFloat(item1!.unit_price)).toEqual(10.00);
    expect(parseFloat(item1!.total_price)).toEqual(20.00);

    expect(item2).toBeDefined();
    expect(item2!.quantity).toEqual(1);
    expect(parseFloat(item2!.unit_price)).toEqual(8.00);
    expect(parseFloat(item2!.total_price)).toEqual(8.00);
  });

  it('should update product stock quantities', async () => {
    const input = createTestSaleInput();
    await createSale(input);

    const product1 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId1))
      .execute();
    
    const product2 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId2))
      .execute();

    expect(product1[0].current_stock).toEqual(98); // 100 - 2
    expect(product2[0].current_stock).toEqual(49); // 50 - 1
  });

  it('should create stock movement records', async () => {
    const input = createTestSaleInput();
    const result = await createSale(input);

    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.reference_id, result.id))
      .execute();

    expect(movements).toHaveLength(2);

    const movement1 = movements.find(m => m.product_id === testProductId1);
    const movement2 = movements.find(m => m.product_id === testProductId2);

    expect(movement1).toBeDefined();
    expect(movement1!.movement_type).toEqual('out');
    expect(movement1!.quantity).toEqual(-2);
    expect(movement1!.created_by).toEqual(testCashierId);
    expect(movement1!.notes).toMatch(/^Sale transaction TXN-/);

    expect(movement2).toBeDefined();
    expect(movement2!.movement_type).toEqual('out');
    expect(movement2!.quantity).toEqual(-1);
    expect(movement2!.created_by).toEqual(testCashierId);
  });

  it('should save sale to database', async () => {
    const input = createTestSaleInput();
    const result = await createSale(input);

    const sales = await db.select()
      .from(salesTable)
      .where(eq(salesTable.id, result.id))
      .execute();

    expect(sales).toHaveLength(1);
    expect(sales[0].cashier_id).toEqual(testCashierId);
    expect(parseFloat(sales[0].total_amount)).toEqual(28.00);
    expect(parseFloat(sales[0].payment_received)).toEqual(30.00);
    expect(parseFloat(sales[0].change_given)).toEqual(2.00);
  });

  it('should throw error for non-existent product', async () => {
    const input: CreateSaleInput = {
      cashier_id: testCashierId,
      payment_method: 'cash',
      payment_received: 20.00,
      items: [
        {
          product_id: 99999,
          quantity: 1,
          unit_price: 10.00
        }
      ]
    };

    await expect(createSale(input)).rejects.toThrow(/Product with ID 99999 not found/);
  });

  it('should throw error for insufficient stock', async () => {
    const input: CreateSaleInput = {
      cashier_id: testCashierId,
      payment_method: 'cash',
      payment_received: 200.00,
      items: [
        {
          product_id: testProductId1,
          quantity: 150, // More than available stock (100)
          unit_price: 10.00
        }
      ]
    };

    await expect(createSale(input)).rejects.toThrow(/Insufficient stock for product/);
  });

  it('should handle zero change correctly', async () => {
    const input: CreateSaleInput = {
      cashier_id: testCashierId,
      payment_method: 'cash',
      payment_received: 28.00, // Exact amount
      items: [
        {
          product_id: testProductId1,
          quantity: 2,
          unit_price: 10.00
        },
        {
          product_id: testProductId2,
          quantity: 1,
          unit_price: 8.00
        }
      ]
    };

    const result = await createSale(input);
    expect(result.change_given).toEqual(0.00);
  });
});
