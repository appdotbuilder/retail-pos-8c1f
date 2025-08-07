
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
    // Create test category
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic devices'
      })
      .returning()
      .execute();

    const categoryId = category[0].id;

    // Create test products
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'iPhone 15',
          sku: 'IPHONE15',
          barcode: '1234567890',
          category_id: categoryId,
          selling_price: '999.99',
          cost_price: '800.00',
          current_stock: 10,
          min_stock_level: 5,
          is_active: true
        },
        {
          name: 'Samsung Galaxy',
          sku: 'GALAXY23',
          barcode: '9876543210',
          category_id: categoryId,
          selling_price: '899.99',
          cost_price: '700.00',
          current_stock: 15,
          min_stock_level: 3,
          is_active: true
        },
        {
          name: 'iPad Pro',
          sku: 'IPADPRO',
          barcode: null,
          category_id: categoryId,
          selling_price: '1299.99',
          cost_price: '1000.00',
          current_stock: 5,
          min_stock_level: 2,
          is_active: false // Inactive product
        }
      ])
      .returning()
      .execute();

    return { categoryId, products };
  };

  const testInput: SearchProductInput = {
    query: 'iPhone',
    limit: 10
  };

  it('should search products by name', async () => {
    await createTestData();

    const result = await searchProducts(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('iPhone 15');
    expect(result[0].sku).toEqual('IPHONE15');
    expect(result[0].selling_price).toEqual(999.99);
    expect(result[0].cost_price).toEqual(800.00);
    expect(typeof result[0].selling_price).toBe('number');
    expect(typeof result[0].cost_price).toBe('number');
  });

  it('should search products by SKU', async () => {
    await createTestData();

    const skuInput: SearchProductInput = {
      query: 'GALAXY',
      limit: 10
    };

    const result = await searchProducts(skuInput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Samsung Galaxy');
    expect(result[0].sku).toEqual('GALAXY23');
  });

  it('should search products by barcode', async () => {
    await createTestData();

    const barcodeInput: SearchProductInput = {
      query: '1234567890',
      limit: 10
    };

    const result = await searchProducts(barcodeInput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('iPhone 15');
    expect(result[0].barcode).toEqual('1234567890');
  });

  it('should perform fuzzy matching', async () => {
    await createTestData();

    const fuzzyInput: SearchProductInput = {
      query: 'sam',
      limit: 10
    };

    const result = await searchProducts(fuzzyInput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Samsung Galaxy');
  });

  it('should filter by category', async () => {
    const { categoryId } = await createTestData();

    // Create another category with a product
    const category2 = await db.insert(categoriesTable)
      .values({
        name: 'Books',
        description: 'Books and literature'
      })
      .returning()
      .execute();

    await db.insert(productsTable)
      .values({
        name: 'iPhone Manual',
        sku: 'MANUAL01',
        barcode: '5555555555',
        category_id: category2[0].id,
        selling_price: '19.99',
        cost_price: '10.00',
        current_stock: 100,
        min_stock_level: 10,
        is_active: true
      })
      .execute();

    const categoryInput: SearchProductInput = {
      query: 'iPhone',
      category_id: categoryId,
      limit: 10
    };

    const result = await searchProducts(categoryInput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('iPhone 15');
    expect(result[0].category_id).toEqual(categoryId);
  });

  it('should respect limit parameter', async () => {
    await createTestData();

    const limitInput: SearchProductInput = {
      query: 'a', // Should match both iPhone and Galaxy
      limit: 1
    };

    const result = await searchProducts(limitInput);

    expect(result).toHaveLength(1);
  });

  it('should only return active products', async () => {
    await createTestData();

    const padInput: SearchProductInput = {
      query: 'iPad',
      limit: 10
    };

    const result = await searchProducts(padInput);

    expect(result).toHaveLength(0); // iPad Pro is inactive
  });

  it('should return empty array for no matches', async () => {
    await createTestData();

    const noMatchInput: SearchProductInput = {
      query: 'NonExistentProduct',
      limit: 10
    };

    const result = await searchProducts(noMatchInput);

    expect(result).toHaveLength(0);
  });

  it('should handle empty query string', async () => {
    await createTestData();

    const emptyInput: SearchProductInput = {
      query: '',
      limit: 10
    };

    const result = await searchProducts(emptyInput);

    expect(result).toHaveLength(2); // Should return all active products
  });
});
