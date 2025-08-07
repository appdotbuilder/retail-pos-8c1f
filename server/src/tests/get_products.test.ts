
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable, usersTable } from '../db/schema';
import { type CreateProductInput, type CreateCategoryInput } from '../schema';
import { getProducts } from '../handlers/get_products';

// Test data
const testCategory: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing'
};

const testProduct: CreateProductInput = {
  name: 'Test Product',
  sku: 'TEST001',
  barcode: '1234567890',
  category_id: 1, // Will be set after creating category
  selling_price: 19.99,
  cost_price: 10.00,
  initial_stock: 100,
  min_stock_level: 10
};

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return all active products', async () => {
    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create test product
    await db.insert(productsTable)
      .values({
        name: testProduct.name,
        sku: testProduct.sku,
        barcode: testProduct.barcode,
        category_id: categoryResult[0].id,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString(),
        current_stock: testProduct.initial_stock,
        min_stock_level: testProduct.min_stock_level
      })
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Test Product');
    expect(result[0].sku).toEqual('TEST001');
    expect(result[0].barcode).toEqual('1234567890');
    expect(result[0].category_id).toEqual(categoryResult[0].id);
    expect(result[0].selling_price).toEqual(19.99);
    expect(result[0].cost_price).toEqual(10.00);
    expect(result[0].current_stock).toEqual(100);
    expect(result[0].min_stock_level).toEqual(10);
    expect(result[0].is_active).toBe(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should only return active products', async () => {
    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create active product
    await db.insert(productsTable)
      .values({
        name: 'Active Product',
        sku: 'ACTIVE001',
        barcode: null,
        category_id: categoryResult[0].id,
        selling_price: '15.99',
        cost_price: '8.00',
        current_stock: 50,
        min_stock_level: 5,
        is_active: true
      })
      .execute();

    // Create inactive product
    await db.insert(productsTable)
      .values({
        name: 'Inactive Product',
        sku: 'INACTIVE001',
        barcode: null,
        category_id: categoryResult[0].id,
        selling_price: '25.99',
        cost_price: '12.00',
        current_stock: 0,
        min_stock_level: 0,
        is_active: false
      })
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Active Product');
    expect(result[0].is_active).toBe(true);
  });

  it('should handle products with null barcode correctly', async () => {
    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create product with null barcode
    await db.insert(productsTable)
      .values({
        name: 'No Barcode Product',
        sku: 'NOBAR001',
        barcode: null,
        category_id: categoryResult[0].id,
        selling_price: '12.50',
        cost_price: '6.25',
        current_stock: 25,
        min_stock_level: 2
      })
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('No Barcode Product');
    expect(result[0].barcode).toBeNull();
    expect(typeof result[0].selling_price).toBe('number');
    expect(typeof result[0].cost_price).toBe('number');
  });

  it('should return multiple products correctly', async () => {
    // Create prerequisite category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create multiple products
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          sku: 'PROD001',
          barcode: '111',
          category_id: categoryResult[0].id,
          selling_price: '10.00',
          cost_price: '5.00',
          current_stock: 10,
          min_stock_level: 1
        },
        {
          name: 'Product 2',
          sku: 'PROD002',
          barcode: '222',
          category_id: categoryResult[0].id,
          selling_price: '20.00',
          cost_price: '10.00',
          current_stock: 20,
          min_stock_level: 2
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    expect(result.some(p => p.name === 'Product 1')).toBe(true);
    expect(result.some(p => p.name === 'Product 2')).toBe(true);
    expect(result.every(p => p.is_active)).toBe(true);
  });
});
