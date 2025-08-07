
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type UpdateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let categoryId: number;
  let productId: number;

  beforeEach(async () => {
    // Create prerequisite category
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();
    categoryId = category[0].id;

    // Create test product
    const product = await db.insert(productsTable)
      .values({
        name: 'Original Product',
        sku: 'ORIG-001',
        barcode: 'orig-barcode',
        category_id: categoryId,
        selling_price: '25.99',
        cost_price: '15.50',
        current_stock: 50,
        min_stock_level: 5
      })
      .returning()
      .execute();
    productId = product[0].id;
  });

  it('should update product name', async () => {
    const input: UpdateProductInput = {
      id: productId,
      name: 'Updated Product Name'
    };

    const result = await updateProduct(input);

    expect(result.id).toEqual(productId);
    expect(result.name).toEqual('Updated Product Name');
    expect(result.sku).toEqual('ORIG-001'); // Unchanged
    expect(result.selling_price).toEqual(25.99);
    expect(result.cost_price).toEqual(15.50);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const input: UpdateProductInput = {
      id: productId,
      name: 'Multi-Updated Product',
      sku: 'MULTI-001',
      selling_price: 35.99,
      cost_price: 20.00,
      min_stock_level: 10
    };

    const result = await updateProduct(input);

    expect(result.name).toEqual('Multi-Updated Product');
    expect(result.sku).toEqual('MULTI-001');
    expect(result.selling_price).toEqual(35.99);
    expect(result.cost_price).toEqual(20.00);
    expect(result.min_stock_level).toEqual(10);
    expect(result.barcode).toEqual('orig-barcode'); // Unchanged
    expect(result.category_id).toEqual(categoryId); // Unchanged
  });

  it('should handle nullable barcode update', async () => {
    const input: UpdateProductInput = {
      id: productId,
      barcode: null
    };

    const result = await updateProduct(input);

    expect(result.barcode).toBeNull();
    expect(result.name).toEqual('Original Product'); // Unchanged
  });

  it('should update barcode to new value', async () => {
    const input: UpdateProductInput = {
      id: productId,
      barcode: 'new-barcode-123'
    };

    const result = await updateProduct(input);

    expect(result.barcode).toEqual('new-barcode-123');
  });

  it('should persist changes in database', async () => {
    const input: UpdateProductInput = {
      id: productId,
      name: 'Database Test Product',
      selling_price: 99.99
    };

    await updateProduct(input);

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Test Product');
    expect(parseFloat(products[0].selling_price)).toEqual(99.99);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();
    const originalTimestamp = originalProduct[0].updated_at;

    // Wait a bit to ensure timestamp difference
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
      id: 99999,
      name: 'Non-existent Product'
    };

    expect(() => updateProduct(input)).toThrow(/Product with id 99999 not found/i);
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
  });

  it('should update category_id', async () => {
    // Create another category
    const newCategory = await db.insert(categoriesTable)
      .values({
        name: 'New Category',
        description: 'Another category'
      })
      .returning()
      .execute();

    const input: UpdateProductInput = {
      id: productId,
      category_id: newCategory[0].id
    };

    const result = await updateProduct(input);

    expect(result.category_id).toEqual(newCategory[0].id);
  });
});
