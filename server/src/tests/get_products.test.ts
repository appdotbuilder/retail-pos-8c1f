
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable, usersTable } from '../db/schema';
import { getProducts } from '../handlers/get_products';
import { type CreateCategoryInput, type CreateProductInput, type CreateUserInput } from '../schema';

// Test data setup
const testCategory: CreateCategoryInput = {
  name: 'Test Category',
  description: 'A category for testing'
};

const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User',
  role: 'admin'
};

const testProduct: CreateProductInput = {
  name: 'Test Product',
  sku: 'TEST-001',
  barcode: '1234567890',
  category_id: 1, // Will be set after category creation
  selling_price: 19.99,
  cost_price: 10.50,
  initial_stock: 100,
  min_stock_level: 5
};

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no products exist', async () => {
    const result = await getProducts();
    expect(result).toEqual([]);
  });

  it('should return active products only', async () => {
    // Create prerequisite data
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create active product
    await db.insert(productsTable)
      .values({
        name: testProduct.name,
        sku: testProduct.sku,
        barcode: testProduct.barcode,
        category_id: categoryId,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString(),
        current_stock: testProduct.initial_stock,
        min_stock_level: testProduct.min_stock_level,
        is_active: true
      })
      .execute();

    // Create inactive product
    await db.insert(productsTable)
      .values({
        name: 'Inactive Product',
        sku: 'INACTIVE-001',
        barcode: '0987654321',
        category_id: categoryId,
        selling_price: '25.99',
        cost_price: '15.00',
        current_stock: 50,
        min_stock_level: 10,
        is_active: false
      })
      .execute();

    const result = await getProducts();

    // Should only return the active product
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Test Product');
    expect(result[0].is_active).toBe(true);
  });

  it('should return products with correct numeric conversions', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create product
    await db.insert(productsTable)
      .values({
        name: testProduct.name,
        sku: testProduct.sku,
        barcode: testProduct.barcode,
        category_id: categoryId,
        selling_price: testProduct.selling_price.toString(),
        cost_price: testProduct.cost_price.toString(),
        current_stock: testProduct.initial_stock,
        min_stock_level: testProduct.min_stock_level,
        is_active: true
      })
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(1);
    const product = result[0];

    // Verify all fields are present and correctly typed
    expect(product.id).toBeDefined();
    expect(product.name).toEqual('Test Product');
    expect(product.sku).toEqual('TEST-001');
    expect(product.barcode).toEqual('1234567890');
    expect(product.category_id).toEqual(categoryId);
    expect(product.selling_price).toEqual(19.99);
    expect(typeof product.selling_price).toBe('number');
    expect(product.cost_price).toEqual(10.50);
    expect(typeof product.cost_price).toBe('number');
    expect(product.current_stock).toEqual(100);
    expect(product.min_stock_level).toEqual(5);
    expect(product.is_active).toBe(true);
    expect(product.created_at).toBeInstanceOf(Date);
    expect(product.updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple products when they exist', async () => {
    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: testCategory.name,
        description: testCategory.description
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create multiple products
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          sku: 'PROD-001',
          barcode: '1111111111',
          category_id: categoryId,
          selling_price: '10.99',
          cost_price: '5.50',
          current_stock: 50,
          min_stock_level: 5,
          is_active: true
        },
        {
          name: 'Product 2',
          sku: 'PROD-002',
          barcode: '2222222222',
          category_id: categoryId,
          selling_price: '15.99',
          cost_price: '8.00',
          current_stock: 75,
          min_stock_level: 10,
          is_active: true
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result).toHaveLength(2);
    
    // Verify both products are returned with correct data
    const product1 = result.find(p => p.sku === 'PROD-001');
    const product2 = result.find(p => p.sku === 'PROD-002');

    expect(product1).toBeDefined();
    expect(product1!.name).toEqual('Product 1');
    expect(product1!.selling_price).toEqual(10.99);
    
    expect(product2).toBeDefined();
    expect(product2!.name).toEqual('Product 2');
    expect(product2!.selling_price).toEqual(15.99);
  });
});
