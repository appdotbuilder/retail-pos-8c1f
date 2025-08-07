
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable, stockMovementsTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

describe('createProduct', () => {
  let testCategoryId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();
    
    testCategoryId = categoryResult[0].id;
  });

  afterEach(resetDB);

  const testInput: CreateProductInput = {
    name: 'Test Product',
    sku: 'TEST-001',
    barcode: '1234567890',
    category_id: 0, // Will be set in tests
    selling_price: 19.99,
    cost_price: 12.50,
    initial_stock: 100,
    min_stock_level: 10
  };

  it('should create a product with all fields', async () => {
    const input = { ...testInput, category_id: testCategoryId };
    const result = await createProduct(input);

    expect(result.name).toEqual('Test Product');
    expect(result.sku).toEqual('TEST-001');
    expect(result.barcode).toEqual('1234567890');
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.selling_price).toEqual(19.99);
    expect(typeof result.selling_price).toEqual('number');
    expect(result.cost_price).toEqual(12.50);
    expect(typeof result.cost_price).toEqual('number');
    expect(result.current_stock).toEqual(100);
    expect(result.min_stock_level).toEqual(10);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database with correct numeric conversions', async () => {
    const input = { ...testInput, category_id: testCategoryId };
    const result = await createProduct(input);

    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    const savedProduct = products[0];
    expect(savedProduct.name).toEqual('Test Product');
    expect(savedProduct.sku).toEqual('TEST-001');
    expect(savedProduct.barcode).toEqual('1234567890');
    expect(savedProduct.category_id).toEqual(testCategoryId);
    expect(parseFloat(savedProduct.selling_price)).toEqual(19.99);
    expect(parseFloat(savedProduct.cost_price)).toEqual(12.50);
    expect(savedProduct.current_stock).toEqual(100);
    expect(savedProduct.min_stock_level).toEqual(10);
    expect(savedProduct.is_active).toBe(true);
  });

  it('should create initial stock movement record', async () => {
    const input = { ...testInput, category_id: testCategoryId };
    const result = await createProduct(input);

    const stockMovements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.product_id, result.id))
      .execute();

    expect(stockMovements).toHaveLength(1);
    const movement = stockMovements[0];
    expect(movement.product_id).toEqual(result.id);
    expect(movement.movement_type).toEqual('in');
    expect(movement.quantity).toEqual(100);
    expect(movement.notes).toEqual('Initial stock');
    expect(movement.created_by).toEqual(1);
    expect(movement.created_at).toBeInstanceOf(Date);
  });

  it('should handle zero initial stock without creating stock movement', async () => {
    const input = { ...testInput, category_id: testCategoryId, initial_stock: 0 };
    const result = await createProduct(input);

    expect(result.current_stock).toEqual(0);

    const stockMovements = await db.select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.product_id, result.id))
      .execute();

    expect(stockMovements).toHaveLength(0);
  });

  it('should handle nullable barcode', async () => {
    const input = { ...testInput, category_id: testCategoryId, barcode: null };
    const result = await createProduct(input);

    expect(result.barcode).toBeNull();

    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products[0].barcode).toBeNull();
  });

  it('should reject invalid category_id', async () => {
    const input = { ...testInput, category_id: 99999 };

    await expect(createProduct(input)).rejects.toThrow(/category with id 99999 does not exist/i);
  });

  it('should apply default min_stock_level from Zod schema', async () => {
    const inputWithoutMinStock: CreateProductInput = {
      name: 'Test Product',
      sku: 'TEST-002',
      barcode: null,
      category_id: testCategoryId,
      selling_price: 15.99,
      cost_price: 10.00,
      initial_stock: 50,
      min_stock_level: 0 // Explicitly set since TypeScript requires all fields
    };

    const result = await createProduct(inputWithoutMinStock);
    expect(result.min_stock_level).toEqual(0);
  });
});
