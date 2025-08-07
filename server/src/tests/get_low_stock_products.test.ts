
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable } from '../db/schema';
import { getLowStockProducts } from '../handlers/get_low_stock_products';

describe('getLowStockProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return products with current stock equal to minimum stock level', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category for products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create product with current stock equal to min stock level
    await db.insert(productsTable)
      .values({
        name: 'Low Stock Product',
        sku: 'LOW001',
        category_id: categoryId,
        selling_price: '19.99',
        cost_price: '10.00',
        current_stock: 5,
        min_stock_level: 5
      })
      .execute();

    const results = await getLowStockProducts();

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Low Stock Product');
    expect(results[0].current_stock).toEqual(5);
    expect(results[0].min_stock_level).toEqual(5);
    expect(typeof results[0].selling_price).toEqual('number');
    expect(results[0].selling_price).toEqual(19.99);
  });

  it('should return products with current stock below minimum stock level', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category for products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create product with current stock below min stock level
    await db.insert(productsTable)
      .values({
        name: 'Very Low Stock Product',
        sku: 'VLOW001',
        category_id: categoryId,
        selling_price: '25.50',
        cost_price: '12.00',
        current_stock: 2,
        min_stock_level: 10
      })
      .execute();

    const results = await getLowStockProducts();

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('Very Low Stock Product');
    expect(results[0].current_stock).toEqual(2);
    expect(results[0].min_stock_level).toEqual(10);
    expect(typeof results[0].cost_price).toEqual('number');
    expect(results[0].cost_price).toEqual(12.00);
  });

  it('should not return products with stock above minimum level', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category for products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create product with current stock above min stock level
    await db.insert(productsTable)
      .values({
        name: 'Good Stock Product',
        sku: 'GOOD001',
        category_id: categoryId,
        selling_price: '15.99',
        cost_price: '8.00',
        current_stock: 50,
        min_stock_level: 10
      })
      .execute();

    const results = await getLowStockProducts();

    expect(results).toHaveLength(0);
  });

  it('should return multiple low stock products', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category for products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create multiple products with low stock
    await db.insert(productsTable)
      .values([
        {
          name: 'Low Stock Product 1',
          sku: 'LOW001',
          category_id: categoryId,
          selling_price: '19.99',
          cost_price: '10.00',
          current_stock: 3,
          min_stock_level: 5
        },
        {
          name: 'Low Stock Product 2',
          sku: 'LOW002',
          category_id: categoryId,
          selling_price: '29.99',
          cost_price: '15.00',
          current_stock: 0,
          min_stock_level: 2
        },
        {
          name: 'Good Stock Product',
          sku: 'GOOD001',
          category_id: categoryId,
          selling_price: '39.99',
          cost_price: '20.00',
          current_stock: 25,
          min_stock_level: 5
        }
      ])
      .execute();

    const results = await getLowStockProducts();

    expect(results).toHaveLength(2);
    
    const productNames = results.map(p => p.name);
    expect(productNames).toContain('Low Stock Product 1');
    expect(productNames).toContain('Low Stock Product 2');
    expect(productNames).not.toContain('Good Stock Product');

    // Verify all numeric conversions work correctly
    results.forEach(product => {
      expect(typeof product.selling_price).toEqual('number');
      expect(typeof product.cost_price).toEqual('number');
    });
  });
});
