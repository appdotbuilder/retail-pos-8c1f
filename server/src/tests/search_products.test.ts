
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable } from '../db/schema';
import { type SearchProductInput } from '../schema';
import { searchProducts } from '../handlers/search_products';

describe('searchProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test data
  const createTestData = async () => {
    // Create categories
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic products'
      })
      .returning()
      .execute();

    const [category2] = await db.insert(categoriesTable)
      .values({
        name: 'Books',
        description: 'Book products'
      })
      .returning()
      .execute();

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'iPhone 15',
          sku: 'PHONE001',
          barcode: '123456789012',
          category_id: category.id,
          selling_price: '999.99',
          cost_price: '800.00',
          current_stock: 10,
          min_stock_level: 5,
          is_active: true
        },
        {
          name: 'Samsung Galaxy',
          sku: 'PHONE002',
          barcode: '123456789013',
          category_id: category.id,
          selling_price: '899.99',
          cost_price: '700.00',
          current_stock: 15,
          min_stock_level: 3,
          is_active: true
        },
        {
          name: 'Programming Book',
          sku: 'BOOK001',
          barcode: '123456789014',
          category_id: category2.id,
          selling_price: '49.99',
          cost_price: '25.00',
          current_stock: 20,
          min_stock_level: 2,
          is_active: true
        },
        {
          name: 'Inactive Phone',
          sku: 'PHONE003',
          barcode: '123456789015',
          category_id: category.id,
          selling_price: '599.99',
          cost_price: '400.00',
          current_stock: 5,
          min_stock_level: 1,
          is_active: false
        }
      ])
      .execute();

    return { category, category2 };
  };

  it('should search products by name', async () => {
    await createTestData();

    const input: SearchProductInput = {
      query: 'iPhone',
      limit: 10
    };

    const results = await searchProducts(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('iPhone 15');
    expect(results[0].sku).toBe('PHONE001');
    expect(typeof results[0].selling_price).toBe('number');
    expect(results[0].selling_price).toBe(999.99);
    expect(typeof results[0].cost_price).toBe('number');
    expect(results[0].cost_price).toBe(800.00);
  });

  it('should search products by SKU', async () => {
    await createTestData();

    const input: SearchProductInput = {
      query: 'BOOK001',
      limit: 10
    };

    const results = await searchProducts(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Programming Book');
    expect(results[0].sku).toBe('BOOK001');
    expect(results[0].selling_price).toBe(49.99);
  });

  it('should search products by barcode', async () => {
    await createTestData();

    const input: SearchProductInput = {
      query: '123456789013',
      limit: 10
    };

    const results = await searchProducts(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Samsung Galaxy');
    expect(results[0].barcode).toBe('123456789013');
  });

  it('should support fuzzy matching', async () => {
    await createTestData();

    const input: SearchProductInput = {
      query: 'phone',
      limit: 10
    };

    const results = await searchProducts(input);

    expect(results).toHaveLength(2); // iPhone and Samsung (but not inactive phone)
    expect(results.some(p => p.name === 'iPhone 15')).toBe(true);
    expect(results.some(p => p.name === 'Samsung Galaxy')).toBe(true);
  });

  it('should filter by category', async () => {
    const { category2 } = await createTestData();

    const input: SearchProductInput = {
      query: 'book',
      category_id: category2.id,
      limit: 10
    };

    const results = await searchProducts(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Programming Book');
    expect(results[0].category_id).toBe(category2.id);
  });

  it('should exclude inactive products', async () => {
    await createTestData();

    const input: SearchProductInput = {
      query: 'Inactive',
      limit: 10
    };

    const results = await searchProducts(input);

    expect(results).toHaveLength(0);
  });

  it('should respect limit parameter', async () => {
    await createTestData();

    const input: SearchProductInput = {
      query: 'phone',
      limit: 1
    };

    const results = await searchProducts(input);

    expect(results).toHaveLength(1);
  });

  it('should return empty array when no matches found', async () => {
    await createTestData();

    const input: SearchProductInput = {
      query: 'nonexistent',
      limit: 10
    };

    const results = await searchProducts(input);

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });

  it('should handle empty query gracefully', async () => {
    await createTestData();

    const input: SearchProductInput = {
      query: '',
      limit: 10
    };

    const results = await searchProducts(input);

    // Should return active products (empty string matches everything with ILIKE)
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(p => p.is_active)).toBe(true);
  });

  it('should convert numeric fields correctly', async () => {
    await createTestData();

    const input: SearchProductInput = {
      query: 'iPhone',
      limit: 10
    };

    const results = await searchProducts(input);

    expect(results).toHaveLength(1);
    expect(typeof results[0].selling_price).toBe('number');
    expect(typeof results[0].cost_price).toBe('number');
    expect(results[0].selling_price).toBe(999.99);
    expect(results[0].cost_price).toBe(800.00);
  });
});
