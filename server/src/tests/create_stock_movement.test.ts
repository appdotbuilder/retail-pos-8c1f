
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { stockMovementsTable, productsTable, usersTable, categoriesTable } from '../db/schema';
import { type CreateStockMovementInput } from '../schema';
import { createStockMovement } from '../handlers/create_stock_movement';
import { eq } from 'drizzle-orm';

describe('createStockMovement', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testCategoryId: number;
  let testProductId: number;

  beforeEach(async () => {
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
        description: 'A test category'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Create test product with initial stock
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        sku: 'TEST-001',
        category_id: testCategoryId,
        selling_price: '10.00',
        cost_price: '5.00',
        current_stock: 50,
        min_stock_level: 10
      })
      .returning()
      .execute();
    testProductId = productResult[0].id;
  });

  it('should create stock movement for in type', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'in',
      quantity: 25,
      notes: 'Restocking from supplier',
      created_by: testUserId
    };

    const result = await createStockMovement(input);

    expect(result.product_id).toEqual(testProductId);
    expect(result.movement_type).toEqual('in');
    expect(result.quantity).toEqual(25);
    expect(result.notes).toEqual('Restocking from supplier');
    expect(result.created_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.reference_id).toBeNull();
  });

  it('should create stock movement for out type', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'out',
      quantity: 20,
      notes: 'Damaged goods removal',
      created_by: testUserId
    };

    const result = await createStockMovement(input);

    expect(result.product_id).toEqual(testProductId);
    expect(result.movement_type).toEqual('out');
    expect(result.quantity).toEqual(20);
    expect(result.notes).toEqual('Damaged goods removal');
    expect(result.created_by).toEqual(testUserId);
    expect(result.id).toBeDefined();
  });

  it('should create stock movement for adjustment type', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'adjustment',
      quantity: 35,
      notes: 'Stock count adjustment',
      created_by: testUserId
    };

    const result = await createStockMovement(input);

    expect(result.product_id).toEqual(testProductId);
    expect(result.movement_type).toEqual('adjustment');
    expect(result.quantity).toEqual(35);
    expect(result.notes).toEqual('Stock count adjustment');
    expect(result.created_by).toEqual(testUserId);
  });

  it('should update product stock for in movement', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'in',
      quantity: 25,
      notes: 'Stock increase',
      created_by: testUserId
    };

    await createStockMovement(input);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .limit(1)
      .execute();

    expect(updatedProduct[0].current_stock).toEqual(75); // 50 + 25
  });

  it('should update product stock for out movement', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'out',
      quantity: 15,
      notes: 'Stock decrease',
      created_by: testUserId
    };

    await createStockMovement(input);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .limit(1)
      .execute();

    expect(updatedProduct[0].current_stock).toEqual(35); // 50 - 15
  });

  it('should update product stock for adjustment movement', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'adjustment',
      quantity: 100,
      notes: 'Manual stock adjustment',
      created_by: testUserId
    };

    await createStockMovement(input);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .limit(1)
      .execute();

    expect(updatedProduct[0].current_stock).toEqual(100); // Set to exact value
  });

  it('should save stock movement to database', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'in',
      quantity: 30,
      notes: 'Database test',
      created_by: testUserId
    };

    const result = await createStockMovement(input);

    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, result.id))
      .execute();

    expect(movements).toHaveLength(1);
    expect(movements[0].product_id).toEqual(testProductId);
    expect(movements[0].movement_type).toEqual('in');
    expect(movements[0].quantity).toEqual(30);
    expect(movements[0].notes).toEqual('Database test');
    expect(movements[0].created_by).toEqual(testUserId);
    expect(movements[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent product', async () => {
    const input: CreateStockMovementInput = {
      product_id: 99999,
      movement_type: 'in',
      quantity: 10,
      notes: null,
      created_by: testUserId
    };

    expect(createStockMovement(input)).rejects.toThrow(/product.*not found/i);
  });

  it('should throw error for insufficient stock on out movement', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'out',
      quantity: 100, // More than current stock of 50
      notes: 'Too much stock removal',
      created_by: testUserId
    };

    expect(createStockMovement(input)).rejects.toThrow(/insufficient stock/i);
  });

  it('should allow out movement with exact current stock', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'out',
      quantity: 50, // Exactly current stock
      notes: 'Clear all stock',
      created_by: testUserId
    };

    const result = await createStockMovement(input);
    expect(result.quantity).toEqual(50);

    const updatedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProductId))
      .limit(1)
      .execute();

    expect(updatedProduct[0].current_stock).toEqual(0);
  });

  it('should handle null notes properly', async () => {
    const input: CreateStockMovementInput = {
      product_id: testProductId,
      movement_type: 'in',
      quantity: 5,
      notes: null,
      created_by: testUserId
    };

    const result = await createStockMovement(input);

    expect(result.notes).toBeNull();
  });
});
