
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, stockMovementsTable } from '../db/schema';
import { type CreateStockMovementInput } from '../schema';
import { createStockMovement } from '../handlers/create_stock_movement';
import { eq } from 'drizzle-orm';

describe('createStockMovement', () => {
  let testUserId: number;
  let testCategoryId: number;
  let testProductId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'stock_manager'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create test product with initial stock of 100
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        sku: 'TEST-001',
        barcode: null,
        category_id: testCategoryId,
        selling_price: '19.99',
        cost_price: '15.00',
        current_stock: 100,
        min_stock_level: 10
      })
      .returning()
      .execute();
    testProductId = productResult[0].id;
  });

  afterEach(resetDB);

  it('should create stock movement for "in" type and increase product stock', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'in',
      quantity: 50,
      notes: 'Inventory replenishment',
      created_by: testUserId
    };

    const result = await createStockMovement(input);

    // Verify movement record
    expect(result.product_id).toEqual(testProductId);
    expect(result.movement_type).toEqual('in');
    expect(result.quantity).toEqual(50);
    expect(result.notes).toEqual('Inventory replenishment');
    expect(result.created_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify product stock was updated (100 + 50 = 150)
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    
    expect(products[0].current_stock).toEqual(150);
  });

  it('should create stock movement for "out" type and decrease product stock', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'out',
      quantity: 30,
      notes: 'Sale transaction',
      created_by: testUserId
    };

    const result = await createStockMovement(input);

    // Verify movement record
    expect(result.movement_type).toEqual('out');
    expect(result.quantity).toEqual(30);

    // Verify product stock was updated (100 - 30 = 70)
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    
    expect(products[0].current_stock).toEqual(70);
  });

  it('should create stock movement for "adjustment" type and set exact stock level', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'adjustment',
      quantity: 75,
      notes: 'Stock count adjustment',
      created_by: testUserId
    };

    const result = await createStockMovement(input);

    // Verify movement record
    expect(result.movement_type).toEqual('adjustment');
    expect(result.quantity).toEqual(75);

    // Verify product stock was set to exact value (75)
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    
    expect(products[0].current_stock).toEqual(75);
  });

  it('should save stock movement to database', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'in',
      quantity: 25,
      notes: 'Test movement',
      created_by: testUserId
    };

    const result = await createStockMovement(input);

    // Verify record exists in database
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(movements).toHaveLength(1);
    expect(movements[0].product_id).toEqual(testProductId);
    expect(movements[0].movement_type).toEqual('in');
    expect(movements[0].quantity).toEqual(25);
    expect(movements[0].notes).toEqual('Test movement');
    expect(movements[0].created_by).toEqual(testUserId);
    expect(movements[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when trying to move out more stock than available', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'out',
      quantity: 150, // More than current stock of 100
      notes: 'Oversell attempt',
      created_by: testUserId
    };

    await expect(createStockMovement(input)).rejects.toThrow(/insufficient stock/i);

    // Verify product stock was not changed
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .execute();
    
    expect(products[0].current_stock).toEqual(100);
  });

  it('should throw error when product does not exist', async () => {
    const input: CreateStockMovementInput = {
      product_id: 99999, // Non-existent product
      movement_type: 'in',
      quantity: 10,
      notes: 'Test movement',
      created_by: testUserId
    };

    await expect(createStockMovement(input)).rejects.toThrow(/product with id 99999 not found/i);
  });

  it('should handle movement with null notes', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'in',
      quantity: 20,
      notes: null,
      created_by: testUserId
    };

    const result = await createStockMovement(input);

    expect(result.notes).toBeNull();
    expect(result.quantity).toEqual(20);
  });
});
