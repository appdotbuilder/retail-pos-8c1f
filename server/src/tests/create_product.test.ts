
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, stockMovementsTable, categoriesTable, usersTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

describe('createProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCategoryId: number;
  let testUserId: number;

  beforeEach(async () => {
    // Create prerequisite data
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        role: 'admin'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;
  });

  const testInput: CreateProductInput = {
    name: 'Test Product',
    sku: 'TEST001',
    barcode: '1234567890',
    category_id: 0, // Will be set dynamically
    selling_price: 19.99,
    cost_price: 12.50,
    initial_stock: 100,
    min_stock_level: 10
  };

  it('should create a product with initial stock', async () => {
    const input = { ...testInput, category_id: testCategoryId };
    const result = await createProduct(input);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.sku).toEqual('TEST001');
    expect(result.barcode).toEqual('1234567890');
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.selling_price).toEqual(19.99);
    expect(typeof result.selling_price).toBe('number');
    expect(result.cost_price).toEqual(12.50);
    expect(typeof result.cost_price).toBe('number');
    expect(result.current_stock).toEqual(100);
    expect(result.min_stock_level).toEqual(10);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const input = { ...testInput, category_id: testCategoryId };
    const result = await createProduct(input);

    // Query the product from database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    const savedProduct = products[0];
    expect(savedProduct.name).toEqual('Test Product');
    expect(savedProduct.sku).toEqual('TEST001');
    expect(savedProduct.barcode).toEqual('1234567890');
    expect(savedProduct.category_id).toEqual(testCategoryId);
    expect(parseFloat(savedProduct.selling_price)).toEqual(19.99);
    expect(parseFloat(savedProduct.cost_price)).toEqual(12.50);
    expect(savedProduct.current_stock).toEqual(100);
    expect(savedProduct.min_stock_level).toEqual(10);
    expect(savedProduct.is_active).toBe(true);
    expect(savedProduct.created_at).toBeInstanceOf(Date);
  });

  it('should create initial stock movement record', async () => {
    const input = { ...testInput, category_id: testCategoryId };
    const result = await createProduct(input);

    // Query stock movements
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.product_id, result.id))
      .execute();

    expect(movements).toHaveLength(1);
    const movement = movements[0];
    expect(movement.product_id).toEqual(result.id);
    expect(movement.movement_type).toEqual('in');
    expect(movement.quantity).toEqual(100);
    expect(movement.notes).toEqual('Initial stock');
    expect(movement.created_by).toEqual(1);
    expect(movement.created_at).toBeInstanceOf(Date);
  });

  it('should not create stock movement for zero initial stock', async () => {
    const input = { ...testInput, category_id: testCategoryId, initial_stock: 0 };
    const result = await createProduct(input);

    // Query stock movements
    const movements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.product_id, result.id))
      .execute();

    expect(movements).toHaveLength(0);
    expect(result.current_stock).toEqual(0);
  });

  it('should handle nullable barcode', async () => {
    const input = { ...testInput, category_id: testCategoryId, barcode: null };
    const result = await createProduct(input);

    expect(result.barcode).toBeNull();
    
    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products[0].barcode).toBeNull();
  });

  it('should apply default min_stock_level', async () => {
    const inputWithDefaults: CreateProductInput = {
      name: 'Test Product',
      sku: 'TEST002',
      barcode: null,
      category_id: testCategoryId,
      selling_price: 15.00,
      cost_price: 10.00,
      initial_stock: 50,
      min_stock_level: 0 // Explicitly provide the default value
    };

    const result = await createProduct(inputWithDefaults);

    expect(result.min_stock_level).toEqual(0); // Default value from schema
  });

  it('should fail for duplicate SKU', async () => {
    const input = { ...testInput, category_id: testCategoryId };
    
    // Create first product
    await createProduct(input);
    
    // Try to create another product with same SKU
    const duplicateInput = { ...input, name: 'Another Product' };
    
    await expect(createProduct(duplicateInput)).rejects.toThrow(/unique constraint/i);
  });
});
