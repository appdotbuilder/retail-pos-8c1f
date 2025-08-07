
import { db } from '../db';
import { salesTable, saleItemsTable, productsTable, usersTable } from '../db/schema';
import { type GetReportInput, type SalesReport } from '../schema';
import { gte, lte, and, eq, desc, sum, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function getSalesReport(input: GetReportInput): Promise<SalesReport> {
  try {
    const { start_date, end_date } = input;

    // Get total sales and transactions
    const salesSummary = await db
      .select({
        total_sales: sum(salesTable.total_amount),
        total_transactions: count(salesTable.id)
      })
      .from(salesTable)
      .where(and(
        gte(salesTable.created_at, start_date),
        lte(salesTable.created_at, end_date)
      ))
      .execute();

    const totalSales = parseFloat(salesSummary[0]?.total_sales || '0');
    const totalTransactions = Number(salesSummary[0]?.total_transactions || 0);

    // Get profit calculation and top products
    const profitAndTopProducts = await db
      .select({
        product_id: saleItemsTable.product_id,
        product_name: productsTable.name,
        quantity_sold: sum(saleItemsTable.quantity),
        total_revenue: sum(saleItemsTable.total_price),
        cost_price: productsTable.cost_price
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
      .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
      .where(and(
        gte(salesTable.created_at, start_date),
        lte(salesTable.created_at, end_date)
      ))
      .groupBy(saleItemsTable.product_id, productsTable.name, productsTable.cost_price)
      .orderBy(desc(sum(saleItemsTable.total_price)))
      .execute();

    // Calculate total profit and prepare top products
    let totalProfit = 0;
    const topProducts = profitAndTopProducts.map(item => {
      const quantitySold = Number(item.quantity_sold || 0);
      const totalRevenue = parseFloat(item.total_revenue || '0');
      const costPrice = parseFloat(item.cost_price || '0');
      const profit = (totalRevenue) - (costPrice * quantitySold);
      
      totalProfit += profit;

      return {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity_sold: quantitySold,
        total_revenue: totalRevenue
      };
    });

    return {
      start_date,
      end_date,
      total_sales: totalSales,
      total_transactions: totalTransactions,
      total_profit: totalProfit,
      top_products: topProducts
    };
  } catch (error) {
    console.error('Sales report generation failed:', error);
    throw error;
  }
}
