
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type UpdateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

describe('updateProduct', () => {
  let categoryId: number;
  let productId: number;

  beforeEach(async () => {
    await createDB();

    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Create a test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Original Product',
        sku: 'ORIG-001',
        barcode: 'original-barcode',
        category_id: categoryId,
        selling_price: '19.99',
        cost_price: '10.00',
        current_stock: 50,
        min_stock_level: 5
      })
      .returning()
      .execute();
    productId = productResult[0].id;
  });

  afterEach(resetDB);

  it('should update product name', async () => {
    const input: UpdateProductInput = {
      id: productId,
      name: 'Updated Product Name'
    };

    const result = await updateProduct(input);

    expect(result.id).toEqual(productId);
    expect(result.name).toEqual('Updated Product Name');
    expect(result.sku).toEqual('ORIG-001'); // Should remain unchanged
    expect(result.selling_price).toEqual(19.99);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields', async () => {
    const input: UpdateProductInput = {
      id: productId,
      name: 'Multi-Updated Product',
      sku: 'MULTI-001',
      selling_price: 29.99,
      cost_price: 15.50,
      min_stock_level: 10
    };

    const result = await updateProduct(input);

    expect(result.name).toEqual('Multi-Updated Product');
    expect(result.sku).toEqual('MULTI-001');
    expect(result.selling_price).toEqual(29.99);
    expect(result.cost_price).toEqual(15.50);
    expect(result.min_stock_level).toEqual(10);
    expect(result.barcode).toEqual('original-barcode'); // Should remain unchanged
  });

  it('should update barcode to null', async () => {
    const input: UpdateProductInput = {
      id: productId,
      barcode: null
    };

    const result = await updateProduct(input);

    expect(result.barcode).toBeNull();
    expect(result.name).toEqual('Original Product'); // Should remain unchanged
  });

  it('should persist changes in database', async () => {
    const input: UpdateProductInput = {
      id: productId,
      name: 'Database Test Product',
      selling_price: 99.99
    };

    await updateProduct(input);

    // Query database directly to verify changes
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Test Product');
    expect(parseFloat(products[0].selling_price)).toEqual(99.99);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Get original timestamp
    const originalProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();
    const originalTimestamp = originalProduct[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateProductInput = {
      id: productId,
      name: 'Timestamp Test'
    };

    const result = await updateProduct(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should throw error for non-existent product', async () => {
    const input: UpdateProductInput = {
      id: 999999,
      name: 'Non-existent Product'
    };

    expect(updateProduct(input)).rejects.toThrow(/Product with id 999999 not found/);
  });

  it('should handle numeric type conversions correctly', async () => {
    const input: UpdateProductInput = {
      id: productId,
      selling_price: 123.45,
      cost_price: 67.89
    };

    const result = await updateProduct(input);

    // Verify returned values are numbers
    expect(typeof result.selling_price).toBe('number');
    expect(typeof result.cost_price).toBe('number');
    expect(result.selling_price).toEqual(123.45);
    expect(result.cost_price).toEqual(67.89);

    // Verify database stores as strings
    const dbProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(typeof dbProduct[0].selling_price).toBe('string');
    expect(typeof dbProduct[0].cost_price).toBe('string');
    expect(dbProduct[0].selling_price).toEqual('123.45');
    expect(dbProduct[0].cost_price).toEqual('67.89');
  });
});
