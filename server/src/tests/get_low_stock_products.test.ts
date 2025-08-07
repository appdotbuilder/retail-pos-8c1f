
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable } from '../db/schema';
import { getLowStockProducts } from '../handlers/get_low_stock_products';

describe('getLowStockProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return products where current stock is at or below minimum level', async () => {
    // Create a test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test products with different stock levels
    await db.insert(productsTable)
      .values([
        {
          name: 'Low Stock Product 1',
          sku: 'LOW001',
          category_id: categoryId,
          selling_price: '19.99',
          cost_price: '10.00',
          current_stock: 5,
          min_stock_level: 10 // current < min
        },
        {
          name: 'Low Stock Product 2', 
          sku: 'LOW002',
          category_id: categoryId,
          selling_price: '29.99',
          cost_price: '15.00',
          current_stock: 8,
          min_stock_level: 8 // current = min
        },
        {
          name: 'Good Stock Product',
          sku: 'GOOD001',
          category_id: categoryId,
          selling_price: '39.99',
          cost_price: '20.00',
          current_stock: 15,
          min_stock_level: 10 // current > min
        }
      ])
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(2);
    
    // Verify the correct products are returned
    const productNames = result.map(p => p.name).sort();
    expect(productNames).toEqual(['Low Stock Product 1', 'Low Stock Product 2']);
    
    // Verify all returned products have low stock
    result.forEach(product => {
      expect(product.current_stock <= product.min_stock_level).toBe(true);
    });

    // Verify numeric conversions
    result.forEach(product => {
      expect(typeof product.selling_price).toBe('number');
      expect(typeof product.cost_price).toBe('number');
    });
  });

  it('should return empty array when no products have low stock', async () => {
    // Create a test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create products with adequate stock
    await db.insert(productsTable)
      .values([
        {
          name: 'Well Stocked Product 1',
          sku: 'WELL001',
          category_id: categoryId,
          selling_price: '19.99',
          cost_price: '10.00',
          current_stock: 20,
          min_stock_level: 10
        },
        {
          name: 'Well Stocked Product 2',
          sku: 'WELL002', 
          category_id: categoryId,
          selling_price: '29.99',
          cost_price: '15.00',
          current_stock: 50,
          min_stock_level: 5
        }
      ])
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(0);
  });

  it('should handle products with zero minimum stock level', async () => {
    // Create a test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create product with zero min stock level
    await db.insert(productsTable)
      .values({
        name: 'Zero Min Stock Product',
        sku: 'ZERO001',
        category_id: categoryId,
        selling_price: '19.99',
        cost_price: '10.00',
        current_stock: 0,
        min_stock_level: 0
      })
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Zero Min Stock Product');
    expect(result[0].current_stock).toBe(0);
    expect(result[0].min_stock_level).toBe(0);
  });

  it('should include all required product fields', async () => {
    // Create a test category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a low stock product
    await db.insert(productsTable)
      .values({
        name: 'Test Product',
        sku: 'TEST001',
        barcode: '1234567890',
        category_id: categoryId,
        selling_price: '19.99',
        cost_price: '10.00',
        current_stock: 3,
        min_stock_level: 5
      })
      .execute();

    const result = await getLowStockProducts();

    expect(result).toHaveLength(1);
    const product = result[0];

    // Verify all fields are present
    expect(product.id).toBeDefined();
    expect(product.name).toBe('Test Product');
    expect(product.sku).toBe('TEST001');
    expect(product.barcode).toBe('1234567890');
    expect(product.category_id).toBe(categoryId);
    expect(product.selling_price).toBe(19.99);
    expect(product.cost_price).toBe(10.00);
    expect(product.current_stock).toBe(3);
    expect(product.min_stock_level).toBe(5);
    expect(product.is_active).toBe(true);
    expect(product.created_at).toBeInstanceOf(Date);
    expect(product.updated_at).toBeInstanceOf(Date);
  });
});
