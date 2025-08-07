
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, stockMovementsTable } from '../db/schema';
import { getStockMovements } from '../handlers/get_stock_movements';

describe('getStockMovements', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all stock movements when no productId provided', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      username: 'stockuser',
      email: 'stock@test.com',
      password_hash: 'hash123',
      full_name: 'Stock User',
      role: 'stock_manager'
    }).returning().execute();

    const category = await db.insert(categoriesTable).values({
      name: 'Test Category',
      description: 'A test category'
    }).returning().execute();

    const product1 = await db.insert(productsTable).values({
      name: 'Product 1',
      sku: 'PROD001',
      category_id: category[0].id,
      selling_price: '10.00',
      cost_price: '5.00',
      current_stock: 100,
      min_stock_level: 10
    }).returning().execute();

    const product2 = await db.insert(productsTable).values({
      name: 'Product 2',
      sku: 'PROD002',
      category_id: category[0].id,
      selling_price: '20.00',
      cost_price: '10.00',
      current_stock: 50,
      min_stock_level: 5
    }).returning().execute();

    // Create stock movements
    await db.insert(stockMovementsTable).values([
      {
        product_id: product1[0].id,
        movement_type: 'in',
        quantity: 50,
        notes: 'Initial stock',
        created_by: user[0].id
      },
      {
        product_id: product2[0].id,
        movement_type: 'out',
        quantity: -10,
        notes: 'Sale',
        created_by: user[0].id
      },
      {
        product_id: product1[0].id,
        movement_type: 'adjustment',
        quantity: -5,
        notes: 'Damaged items',
        created_by: user[0].id
      }
    ]).execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(3);
    
    // Check that all expected movements are present
    const movementTypes = result.map(m => m.movement_type);
    const notes = result.map(m => m.notes);
    
    expect(movementTypes).toContain('in');
    expect(movementTypes).toContain('out');
    expect(movementTypes).toContain('adjustment');
    
    expect(notes).toContain('Initial stock');
    expect(notes).toContain('Sale');
    expect(notes).toContain('Damaged items');
    
    // Verify basic properties
    result.forEach(movement => {
      expect(movement.created_by).toBe(user[0].id);
      expect(movement.created_at).toBeInstanceOf(Date);
      expect(movement.id).toBeDefined();
    });
  });

  it('should return filtered stock movements for specific product', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      username: 'stockuser',
      email: 'stock@test.com',
      password_hash: 'hash123',
      full_name: 'Stock User',
      role: 'stock_manager'
    }).returning().execute();

    const category = await db.insert(categoriesTable).values({
      name: 'Test Category',
      description: 'A test category'
    }).returning().execute();

    const product1 = await db.insert(productsTable).values({
      name: 'Product 1',
      sku: 'PROD001',
      category_id: category[0].id,
      selling_price: '10.00',
      cost_price: '5.00',
      current_stock: 100,
      min_stock_level: 10
    }).returning().execute();

    const product2 = await db.insert(productsTable).values({
      name: 'Product 2',
      sku: 'PROD002',
      category_id: category[0].id,
      selling_price: '20.00',
      cost_price: '10.00',
      current_stock: 50,
      min_stock_level: 5
    }).returning().execute();

    // Create stock movements for both products
    await db.insert(stockMovementsTable).values([
      {
        product_id: product1[0].id,
        movement_type: 'in',
        quantity: 50,
        notes: 'Product 1 stock in',
        created_by: user[0].id
      },
      {
        product_id: product2[0].id,
        movement_type: 'out',
        quantity: -10,
        notes: 'Product 2 stock out',
        created_by: user[0].id
      },
      {
        product_id: product1[0].id,
        movement_type: 'adjustment',
        quantity: -5,
        notes: 'Product 1 adjustment',
        created_by: user[0].id
      }
    ]).execute();

    const result = await getStockMovements(product1[0].id);

    expect(result).toHaveLength(2);
    result.forEach(movement => {
      expect(movement.product_id).toBe(product1[0].id);
    });
    
    // Check that both product 1 movements are present
    const notes = result.map(m => m.notes);
    expect(notes).toContain('Product 1 stock in');
    expect(notes).toContain('Product 1 adjustment');
  });

  it('should return empty array when no movements exist', async () => {
    const result = await getStockMovements();
    
    expect(result).toHaveLength(0);
  });

  it('should return empty array when filtering by non-existent product', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      username: 'stockuser',
      email: 'stock@test.com',
      password_hash: 'hash123',
      full_name: 'Stock User',
      role: 'stock_manager'
    }).returning().execute();

    const category = await db.insert(categoriesTable).values({
      name: 'Test Category',
      description: 'A test category'
    }).returning().execute();

    const product = await db.insert(productsTable).values({
      name: 'Product 1',
      sku: 'PROD001',
      category_id: category[0].id,
      selling_price: '10.00',
      cost_price: '5.00',
      current_stock: 100,
      min_stock_level: 10
    }).returning().execute();

    // Create a movement for existing product
    await db.insert(stockMovementsTable).values({
      product_id: product[0].id,
      movement_type: 'in',
      quantity: 50,
      notes: 'Initial stock',
      created_by: user[0].id
    }).execute();

    // Filter by non-existent product ID
    const result = await getStockMovements(999);

    expect(result).toHaveLength(0);
  });

  it('should include all required fields in response', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable).values({
      username: 'stockuser',
      email: 'stock@test.com',
      password_hash: 'hash123',
      full_name: 'Stock User',
      role: 'stock_manager'
    }).returning().execute();

    const category = await db.insert(categoriesTable).values({
      name: 'Test Category',
      description: 'A test category'
    }).returning().execute();

    const product = await db.insert(productsTable).values({
      name: 'Product 1',
      sku: 'PROD001',
      category_id: category[0].id,
      selling_price: '10.00',
      cost_price: '5.00',
      current_stock: 100,
      min_stock_level: 10
    }).returning().execute();

    await db.insert(stockMovementsTable).values({
      product_id: product[0].id,
      movement_type: 'in',
      quantity: 50,
      reference_id: 123,
      notes: 'Test movement',
      created_by: user[0].id
    }).execute();

    const result = await getStockMovements();

    expect(result).toHaveLength(1);
    const movement = result[0];
    
    expect(movement.id).toBeDefined();
    expect(movement.product_id).toBe(product[0].id);
    expect(movement.movement_type).toBe('in');
    expect(movement.quantity).toBe(50);
    expect(movement.reference_id).toBe(123);
    expect(movement.notes).toBe('Test movement');
    expect(movement.created_by).toBe(user[0].id);
    expect(movement.created_at).toBeInstanceOf(Date);
  });
});
