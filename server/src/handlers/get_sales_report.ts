
import { db } from '../db';
import { salesTable, saleItemsTable, productsTable } from '../db/schema';
import { type GetReportInput, type SalesReport } from '../schema';
import { and, gte, lte, desc, eq, sum, count, sql } from 'drizzle-orm';

export async function getSalesReport(input: GetReportInput): Promise<SalesReport> {
  try {
    const { start_date, end_date } = input;

    // Calculate total sales and transactions
    const salesSummaryResult = await db
      .select({
        total_sales: sum(salesTable.total_amount),
        total_transactions: count(salesTable.id)
      })
      .from(salesTable)
      .where(
        and(
          gte(salesTable.created_at, start_date),
          lte(salesTable.created_at, end_date)
        )
      )
      .execute();

    const salesSummary = salesSummaryResult[0];
    const totalSales = salesSummary.total_sales ? parseFloat(salesSummary.total_sales) : 0;
    const totalTransactions = salesSummary.total_transactions || 0;

    // Calculate total profit and top products
    const topProductsResult = await db
      .select({
        product_id: saleItemsTable.product_id,
        product_name: productsTable.name,
        quantity_sold: sum(saleItemsTable.quantity),
        total_revenue: sum(saleItemsTable.total_price),
        total_cost: sql<string>`SUM(${saleItemsTable.quantity} * ${productsTable.cost_price})`
      })
      .from(saleItemsTable)
      .innerJoin(salesTable, eq(saleItemsTable.sale_id, salesTable.id))
      .innerJoin(productsTable, eq(saleItemsTable.product_id, productsTable.id))
      .where(
        and(
          gte(salesTable.created_at, start_date),
          lte(salesTable.created_at, end_date)
        )
      )
      .groupBy(saleItemsTable.product_id, productsTable.name)
      .orderBy(desc(sum(saleItemsTable.total_price)))
      .execute();

    // Calculate total profit from all products
    let totalProfit = 0;
    const topProducts = topProductsResult.map(product => {
      const quantitySold = product.quantity_sold ? parseInt(product.quantity_sold) : 0;
      const totalRevenue = product.total_revenue ? parseFloat(product.total_revenue) : 0;
      const totalCost = product.total_cost ? parseFloat(product.total_cost) : 0;
      const profit = totalRevenue - totalCost;
      
      totalProfit += profit;

      return {
        product_id: product.product_id,
        product_name: product.product_name,
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
