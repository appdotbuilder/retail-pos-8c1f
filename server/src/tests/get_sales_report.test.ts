
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, salesTable, saleItemsTable } from '../db/schema';
import { type GetReportInput } from '../schema';
import { getSalesReport } from '../handlers/get_sales_report';

// Test data setup
const testUser = {
  username: 'test-cashier',
  email: 'cashier@test.com',
  password_hash: 'hashedpassword',
  full_name: 'Test Cashier',
  role: 'cashier' as const
};

const testCategory = {
  name: 'Test Category',
  description: 'Test category for products'
};

const testProducts = [
  {
    name: 'Product A',
    sku: 'PROD-A-001',
    barcode: 'BARCODE-A',
    selling_price: '15.00',
    cost_price: '10.00',
    current_stock: 100,
    min_stock_level: 10
  },
  {
    name: 'Product B',
    sku: 'PROD-B-001',
    barcode: 'BARCODE-B',
    selling_price: '25.00',
    cost_price: '20.00',
    current_stock: 50,
    min_stock_level: 5
  }
];

describe('getSalesReport', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should generate sales report with no sales', async () => {
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
    expect(result.top_products).toHaveLength(0);
  });

  it('should generate comprehensive sales report with sales data', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const products = await db.insert(productsTable)
      .values(testProducts.map(p => ({ ...p, category_id: category.id })))
      .returning()
      .execute();

    // Create sales with items
    const testSales = [
      {
        transaction_id: 'TXN-001',
        cashier_id: user.id,
        total_amount: '45.00', // 2 * 15 + 1 * 25 = 45
        payment_method: 'cash' as const,
        payment_received: '50.00',
        change_given: '5.00',
        created_at: new Date('2024-01-15T10:00:00Z')
      },
      {
        transaction_id: 'TXN-002',
        cashier_id: user.id,
        total_amount: '40.00', // 1 * 15 + 1 * 25 = 40
        payment_method: 'card' as const,
        payment_received: '40.00',
        change_given: '0.00',
        created_at: new Date('2024-01-20T14:00:00Z')
      }
    ];

    const sales = await db.insert(salesTable)
      .values(testSales)
      .returning()
      .execute();

    // Create sale items
    const saleItems = [
      // Sale 1: 2x Product A, 1x Product B
      {
        sale_id: sales[0].id,
        product_id: products[0].id,
        quantity: 2,
        unit_price: '15.00',
        total_price: '30.00'
      },
      {
        sale_id: sales[0].id,
        product_id: products[1].id,
        quantity: 1,
        unit_price: '25.00',
        total_price: '25.00'
      },
      // Sale 2: 1x Product A, 1x Product B
      {
        sale_id: sales[1].id,
        product_id: products[0].id,
        quantity: 1,
        unit_price: '15.00',
        total_price: '15.00'
      },
      {
        sale_id: sales[1].id,
        product_id: products[1].id,
        quantity: 1,
        unit_price: '25.00',
        total_price: '25.00'
      }
    ];

    await db.insert(saleItemsTable)
      .values(saleItems)
      .returning()
      .execute();

    const input: GetReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      report_type: 'monthly'
    };

    const result = await getSalesReport(input);

    // Verify basic report data
    expect(result.start_date).toEqual(input.start_date);
    expect(result.end_date).toEqual(input.end_date);
    expect(result.total_sales).toEqual(85); // 45 + 40
    expect(result.total_transactions).toEqual(2);

    // Verify profit calculation
    // Product A: (15 - 10) * 3 = 15, Product B: (25 - 20) * 2 = 10
    // Total profit: 25
    expect(result.total_profit).toEqual(25);

    // Verify top products (ordered by total revenue)
    expect(result.top_products).toHaveLength(2);
    
    // Product B should be first (higher revenue: 50)
    expect(result.top_products[0].product_id).toEqual(products[1].id);
    expect(result.top_products[0].product_name).toEqual('Product B');
    expect(result.top_products[0].quantity_sold).toEqual(2);
    expect(result.top_products[0].total_revenue).toEqual(50);

    // Product A should be second (lower revenue: 45)
    expect(result.top_products[1].product_id).toEqual(products[0].id);
    expect(result.top_products[1].product_name).toEqual('Product A');
    expect(result.top_products[1].quantity_sold).toEqual(3);
    expect(result.top_products[1].total_revenue).toEqual(45);
  });

  it('should filter sales by date range correctly', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [category] = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    const [product] = await db.insert(productsTable)
      .values({ ...testProducts[0], category_id: category.id })
      .returning()
      .execute();

    // Create sales in different months
    const salesData = [
      {
        transaction_id: 'TXN-JAN',
        cashier_id: user.id,
        total_amount: '15.00',
        payment_method: 'cash' as const,
        payment_received: '15.00',
        change_given: '0.00',
        created_at: new Date('2024-01-15T10:00:00Z')
      },
      {
        transaction_id: 'TXN-FEB',
        cashier_id: user.id,
        total_amount: '15.00',
        payment_method: 'cash' as const,
        payment_received: '15.00',
        change_given: '0.00',
        created_at: new Date('2024-02-15T10:00:00Z')
      }
    ];

    const sales = await db.insert(salesTable)
      .values(salesData)
      .returning()
      .execute();

    await db.insert(saleItemsTable)
      .values([
        {
          sale_id: sales[0].id,
          product_id: product.id,
          quantity: 1,
          unit_price: '15.00',
          total_price: '15.00'
        },
        {
          sale_id: sales[1].id,
          product_id: product.id,
          quantity: 1,
          unit_price: '15.00',
          total_price: '15.00'
        }
      ])
      .execute();

    // Query only January
    const input: GetReportInput = {
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31'),
      report_type: 'monthly'
    };

    const result = await getSalesReport(input);

    expect(result.total_sales).toEqual(15); // Only January sale
    expect(result.total_transactions).toEqual(1);
    expect(result.top_products).toHaveLength(1);
    expect(result.top_products[0].quantity_sold).toEqual(1);
  });
});
