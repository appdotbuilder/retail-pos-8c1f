
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, salesTable, saleItemsTable } from '../db/schema';
import { type GetReportInput } from '../schema';
import { getSalesReport } from '../handlers/get_sales_report';

describe('getSalesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate sales report with no data', async () => {
    const input: GetReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      report_type: 'monthly'
    };

    const result = await getSalesReport(input);

    expect(result.start_date).toEqual(input.start_date);
    expect(result.end_date).toEqual(input.end_date);
    expect(result.total_sales).toEqual(0);
    expect(result.total_transactions).toEqual(0);
    expect(result.total_profit).toEqual(0);
    expect(result.top_products).toEqual([]);
  });

  it('should generate comprehensive sales report', async () => {
    // Create test data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'cashier1',
        email: 'cashier1@test.com',
        password_hash: 'hash123',
        full_name: 'Test Cashier',
        role: 'cashier'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic items'
      })
      .returning()
      .execute();

    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'Product A',
          sku: 'PROD-A',
          category_id: categoryResult[0].id,
          selling_price: '25.00',
          cost_price: '15.00',
          current_stock: 100,
          min_stock_level: 10
        },
        {
          name: 'Product B',
          sku: 'PROD-B',
          category_id: categoryResult[0].id,
          selling_price: '40.00',
          cost_price: '30.00',
          current_stock: 50,
          min_stock_level: 5
        }
      ])
      .returning()
      .execute();

    const saleDate = new Date('2024-01-15');
    
    // Create two sales
    const saleResults = await db.insert(salesTable)
      .values([
        {
          transaction_id: 'TXN-001',
          cashier_id: userResult[0].id,
          total_amount: '75.00',
          payment_method: 'cash',
          payment_received: '80.00',
          change_given: '5.00',
          created_at: saleDate
        },
        {
          transaction_id: 'TXN-002',
          cashier_id: userResult[0].id,
          total_amount: '120.00',
          payment_method: 'card',
          payment_received: '120.00',
          change_given: '0.00',
          created_at: saleDate
        }
      ])
      .returning()
      .execute();

    // Create sale items
    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: saleResults[0].id,
          product_id: productResults[0].id,
          quantity: 3,
          unit_price: '25.00',
          total_price: '75.00'
        },
        {
          sale_id: saleResults[1].id,
          product_id: productResults[1].id,
          quantity: 3,
          unit_price: '40.00',
          total_price: '120.00'
        }
      ])
      .execute();

    // Generate report
    const input: GetReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      report_type: 'monthly'
    };

    const result = await getSalesReport(input);

    // Validate summary metrics
    expect(result.start_date).toEqual(input.start_date);
    expect(result.end_date).toEqual(input.end_date);
    expect(result.total_sales).toEqual(195); // 75 + 120
    expect(result.total_transactions).toEqual(2);
    expect(result.total_profit).toEqual(60); // (25-15)*3 + (40-30)*3 = 30 + 30

    // Validate top products (sorted by revenue)
    expect(result.top_products).toHaveLength(2);
    
    const topProduct = result.top_products[0];
    expect(topProduct.product_id).toEqual(productResults[1].id);
    expect(topProduct.product_name).toEqual('Product B');
    expect(topProduct.quantity_sold).toEqual(3);
    expect(topProduct.total_revenue).toEqual(120);

    const secondProduct = result.top_products[1];
    expect(secondProduct.product_id).toEqual(productResults[0].id);
    expect(secondProduct.product_name).toEqual('Product A');
    expect(secondProduct.quantity_sold).toEqual(3);
    expect(secondProduct.total_revenue).toEqual(75);
  });

  it('should filter sales by date range', async () => {
    // Create test data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'cashier2',
        email: 'cashier2@test.com',
        password_hash: 'hash123',
        full_name: 'Test Cashier 2',
        role: 'cashier'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Books',
        description: 'Book items'
      })
      .returning()
      .execute();

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Book A',
        sku: 'BOOK-A',
        category_id: categoryResult[0].id,
        selling_price: '20.00',
        cost_price: '12.00',
        current_stock: 100,
        min_stock_level: 10
      })
      .returning()
      .execute();

    // Create sales on different dates
    const sale1Date = new Date('2024-01-10'); // Within range
    const sale2Date = new Date('2024-02-15'); // Outside range

    const saleResults = await db.insert(salesTable)
      .values([
        {
          transaction_id: 'TXN-003',
          cashier_id: userResult[0].id,
          total_amount: '40.00',
          payment_method: 'cash',
          payment_received: '40.00',
          change_given: '0.00',
          created_at: sale1Date
        },
        {
          transaction_id: 'TXN-004',
          cashier_id: userResult[0].id,
          total_amount: '60.00',
          payment_method: 'card',
          payment_received: '60.00',
          change_given: '0.00',
          created_at: sale2Date
        }
      ])
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: saleResults[0].id,
          product_id: productResult[0].id,
          quantity: 2,
          unit_price: '20.00',
          total_price: '40.00'
        },
        {
          sale_id: saleResults[1].id,
          product_id: productResult[0].id,
          quantity: 3,
          unit_price: '20.00',
          total_price: '60.00'
        }
      ])
      .execute();

    // Generate report for January only
    const input: GetReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      report_type: 'monthly'
    };

    const result = await getSalesReport(input);

    // Should only include January sale
    expect(result.total_sales).toEqual(40);
    expect(result.total_transactions).toEqual(1);
    expect(result.total_profit).toEqual(16); // (20-12)*2 = 16
    expect(result.top_products).toHaveLength(1);
    expect(result.top_products[0].quantity_sold).toEqual(2);
    expect(result.top_products[0].total_revenue).toEqual(40);
  });

  it('should handle multiple products with different profit margins', async () => {
    // Create test data
    const userResult = await db.insert(usersTable)
      .values({
        username: 'cashier3',
        email: 'cashier3@test.com',
        password_hash: 'hash123',
        full_name: 'Test Cashier 3',
        role: 'cashier'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Mixed',
        description: 'Mixed items'
      })
      .returning()
      .execute();

    const productResults = await db.insert(productsTable)
      .values([
        {
          name: 'High Margin Product',
          sku: 'HIGH-MARGIN',
          category_id: categoryResult[0].id,
          selling_price: '100.00',
          cost_price: '50.00',
          current_stock: 50,
          min_stock_level: 5
        },
        {
          name: 'Low Margin Product',
          sku: 'LOW-MARGIN',
          category_id: categoryResult[0].id,
          selling_price: '10.00',
          cost_price: '9.50',
          current_stock: 100,
          min_stock_level: 10
        }
      ])
      .returning()
      .execute();

    const saleResult = await db.insert(salesTable)
      .values({
        transaction_id: 'TXN-005',
        cashier_id: userResult[0].id,
        total_amount: '220.00',
        payment_method: 'card',
        payment_received: '220.00',
        change_given: '0.00',
        created_at: new Date('2024-01-20')
      })
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: saleResult[0].id,
          product_id: productResults[0].id,
          quantity: 2,
          unit_price: '100.00',
          total_price: '200.00'
        },
        {
          sale_id: saleResult[0].id,
          product_id: productResults[1].id,
          quantity: 2,
          unit_price: '10.00',
          total_price: '20.00'
        }
      ])
      .execute();

    const input: GetReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      report_type: 'monthly'
    };

    const result = await getSalesReport(input);

    expect(result.total_sales).toEqual(220);
    expect(result.total_transactions).toEqual(1);
    expect(result.total_profit).toEqual(101); // (100-50)*2 + (10-9.5)*2 = 100 + 1

    // Top products should be sorted by revenue (High margin first)
    expect(result.top_products).toHaveLength(2);
    expect(result.top_products[0].product_name).toEqual('High Margin Product');
    expect(result.top_products[0].total_revenue).toEqual(200);
    expect(result.top_products[1].product_name).toEqual('Low Margin Product');
    expect(result.top_products[1].total_revenue).toEqual(20);
  });
});
