
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, stockMovementsTable } from '../db/schema';
import { getStockMovements } from '../handlers/get_stock_movements';

describe('getStockMovements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all stock movements when no productId is provided', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        sku: 'SKU001',
        category_id: categoryId,
        selling_price: '10.00',
        cost_price: '5.00'
      })
      .returning()
      .execute();
    const product1Id = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        sku: 'SKU002',
        category_id: categoryId,
        selling_price: '20.00',
        cost_price: '10.00'
      })
      .returning()
      .execute();
    const product2Id = product2Result[0].id;

    // Create stock movements
    await db.insert(stockMovementsTable)
      .values([
        {
          product_id: product1Id,
          movement_type: 'in',
          quantity: 100,
          notes: 'Initial stock',
          created_by: userId
        },
        {
          product_id: product2Id,
          movement_type: 'in',
          quantity: 50,
          notes: 'Restock',
          created_by: userId
        },
        {
          product_id: product1Id,
          movement_type: 'out',
          quantity: 5,
          notes: 'Sale',
          created_by: userId
        }
      ])
      .execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(3);
    
    // Verify movement types are present
    const movementTypes = result.map(m => m.movement_type);
    expect(movementTypes).toContain('in');
    expect(movementTypes).toContain('out');

    // Verify all movements have required fields
    result.forEach(movement => {
      expect(movement.id).toBeDefined();
      expect(movement.product_id).toBeDefined();
      expect(movement.movement_type).toBeDefined();
      expect(movement.quantity).toBeDefined();
      expect(movement.created_by).toBe(userId);
      expect(movement.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return filtered stock movements for specific product', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        sku: 'SKU001',
        category_id: categoryId,
        selling_price: '10.00',
        cost_price: '5.00'
      })
      .returning()
      .execute();
    const product1Id = product1Result[0].id;

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        sku: 'SKU002',
        category_id: categoryId,
        selling_price: '20.00',
        cost_price: '10.00'
      })
      .returning()
      .execute();
    const product2Id = product2Result[0].id;

    // Create stock movements for both products
    await db.insert(stockMovementsTable)
      .values([
        {
          product_id: product1Id,
          movement_type: 'in',
          quantity: 100,
          notes: 'Product 1 stock',
          created_by: userId
        },
        {
          product_id: product2Id,
          movement_type: 'in',
          quantity: 50,
          notes: 'Product 2 stock',
          created_by: userId
        },
        {
          product_id: product1Id,
          movement_type: 'out',
          quantity: 10,
          notes: 'Product 1 sale',
          created_by: userId
        }
      ])
      .execute();

    const result = await getStockMovements(product1Id);

    expect(result).toHaveLength(2);
    
    // All movements should be for product1
    result.forEach(movement => {
      expect(movement.product_id).toBe(product1Id);
      expect(movement.created_by).toBe(userId);
      expect(movement.created_at).toBeInstanceOf(Date);
    });

    // Should include both in and out movements for product1
    const movementTypes = result.map(m => m.movement_type);
    expect(movementTypes).toContain('in');
    expect(movementTypes).toContain('out');
  });

  it('should return empty array when no stock movements exist', async () => {
    const result = await getStockMovements();
    expect(result).toHaveLength(0);
  });

  it('should return empty array when filtering by non-existent product', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category and product
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        sku: 'SKU001',
        category_id: categoryId,
        selling_price: '10.00',
        cost_price: '5.00'
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    // Create stock movement
    await db.insert(stockMovementsTable)
      .values({
        product_id: productId,
        movement_type: 'in',
        quantity: 100,
        notes: 'Initial stock',
        created_by: userId
      })
      .execute();

    // Query for non-existent product
    const result = await getStockMovements(99999);
    expect(result).toHaveLength(0);
  });
});
