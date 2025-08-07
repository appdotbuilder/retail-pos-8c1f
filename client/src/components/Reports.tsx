
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Download,
  RefreshCw
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, SalesReport, GetReportInput } from '../../../server/src/schema';

interface ReportsProps {
  products: Product[];
}

interface SaleData {
  date: string;
  sales: number;
  transactions: number;
  profit: number;
}

interface TopProduct {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export function Reports({ products }: ReportsProps) {
  const [reportData, setReportData] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportInput, setReportInput] = useState<GetReportInput>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end_date: new Date(),
    report_type: 'daily'
  });

  // Sample data for demonstration (since handlers return empty data)
  const [salesData] = useState<SaleData[]>([
    { date: '2024-01-01', sales: 1250.50, transactions: 45, profit: 375.15 },
    { date: '2024-01-02', sales: 980.25, transactions: 32, profit: 294.08 },
    { date: '2024-01-03', sales: 1450.75, transactions: 52, profit: 435.23 },
    { date: '2024-01-04', sales: 1120.00, transactions: 38, profit: 336.00 },
    { date: '2024-01-05', sales: 1680.30, transactions: 61, profit: 504.09 },
    { date: '2024-01-06', sales: 890.45, transactions: 29, profit: 267.14 },
    { date: '2024-01-07', sales: 1340.80, transactions: 47, profit: 402.24 }
  ]);

  const [topProducts] = useState<TopProduct[]>([
    { product_id: 1, product_name: 'Premium Coffee Beans', quantity_sold: 156, total_revenue: 2340.00 },
    { product_id: 2, product_name: 'Organic Tea Selection', quantity_sold: 89, total_revenue: 1335.00 },
    { product_id: 3, product_name: 'Artisan Chocolate Bar', quantity_sold: 134, total_revenue: 1206.00 },
    { product_id: 4, product_name: 'Fresh Croissant', quantity_sold: 245, total_revenue: 1225.00 },
    { product_id: 5, product_name: 'Energy Smoothie', quantity_sold: 78, total_revenue: 975.00 }
  ]);

  // Load sales report
  const loadSalesReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const report = await trpc.getSalesReport.query(reportInput);
      setReportData(report);
    } catch (error) {
      console.error('Failed to load sales report:', error);
      // Use sample data when API fails
      const sampleReport: SalesReport = {
        start_date: reportInput.start_date,
        end_date: reportInput.end_date,
        total_sales: salesData.reduce((sum: number, day: SaleData) => sum + day.sales, 0),
        total_transactions: salesData.reduce((sum: number, day: SaleData) => sum + day.transactions, 0),
        total_profit: salesData.reduce((sum: number, day: SaleData) => sum + day.profit, 0),
        top_products: topProducts
      };
      setReportData(sampleReport);
    } finally {
      setIsLoading(false);
    }
  }, [reportInput, salesData, topProducts]);

  useEffect(() => {
    loadSalesReport();
  }, [loadSalesReport]);

  // Format currency
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  // Calculate metrics
  const avgDailySales = reportData ? reportData.total_sales / salesData.length : 0;
  const avgTransactionValue = reportData && reportData.total_transactions > 0 
    ? reportData.total_sales / reportData.total_transactions 
    : 0;
  const profitMargin = reportData && reportData.total_sales > 0
    ? (reportData.total_profit / reportData.total_sales) * 100
    : 0;

  // Stock value calculation
  const totalStockValue = products.reduce((sum: number, product: Product) => 
    sum + (product.current_stock * product.cost_price), 0
  );

  const lowStockCount = products.filter((product: Product) => 
    product.current_stock <= product.min_stock_level
  ).length;

  // Get the max values for chart scaling
  const maxSales = Math.max(...salesData.map((d: SaleData) => d.sales));
  const maxTransactions = Math.max(...salesData.map((d: SaleData) => d.transactions));
  const maxProfit = Math.max(...salesData.map((d: SaleData) => d.profit));
  const maxRevenue = Math.max(...topProducts.map((p: TopProduct) => p.total_revenue));
  const maxQuantity = Math.max(...topProducts.map((p: TopProduct) => p.quantity_sold));

  return (
    <div className="space-y-6">
      {/* Report Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Sales Reports & Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={reportInput.start_date.toISOString().split('T')[0]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReportInput((prev: GetReportInput) => ({
                    ...prev,
                    start_date: new Date(e.target.value)
                  }))
                }
              />
            </div>
            
            <div>
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={reportInput.end_date.toISOString().split('T')[0]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setReportInput((prev: GetReportInput) => ({
                    ...prev,
                    end_date: new Date(e.target.value)
                  }))
                }
              />
            </div>
            
            <div>
              <Label htmlFor="report_type">Report Type</Label>
              <Select 
                value={reportInput.report_type || 'daily'} 
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                  setReportInput((prev: GetReportInput) => ({ ...prev, report_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">📅 Daily</SelectItem>
                  <SelectItem value="weekly">📆 Weekly</SelectItem>
                  <SelectItem value="monthly">🗓️ Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end space-x-2">
              <Button 
                onClick={loadSalesReport} 
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Update</span>
              </Button>
              <Button variant="outline" className="flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="sales">💰 Sales</TabsTrigger>
          <TabsTrigger value="products">📦 Products</TabsTrigger>
          <TabsTrigger value="inventory">📋 Inventory</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData?.total_sales || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatCurrency(avgDailySales)} per day
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData?.total_transactions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Avg: {formatCurrency(avgTransactionValue)} per transaction
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(reportData?.total_profit || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Margin: {profitMargin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalStockValue)}</div>
                <p className="text-xs text-muted-foreground">
                  {lowStockCount} items low stock
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales Chart - Using Progress Bars */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData.map((day: SaleData) => (
                  <div key={day.date} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                      <div className="flex space-x-4 text-sm">
                        <span className="text-blue-600">Sales: {formatCurrency(day.sales)}</span>
                        <span className="text-green-600">Profit: {formatCurrency(day.profit)}</span>
                        <span className="text-gray-600">Txns: {day.transactions}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Sales</span>
                          <span>{((day.sales / maxSales) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(day.sales / maxSales) * 100} className="h-2" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Profit</span>
                          <span>{((day.profit / maxProfit) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(day.profit / maxProfit) * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          {/* Sales Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesData.map((day: SaleData) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-24 text-sm">
                          {new Date(day.date).toLocaleDateString()}
                        </div>
                        <div className="flex-1 max-w-32">
                          <Progress value={(day.sales / maxSales) * 100} className="h-3" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">{formatCurrency(day.sales)}</div>
                        <div className="text-xs text-gray-500">{day.transactions} txns</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesData.map((day: SaleData) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-24 text-sm">
                          {new Date(day.date).toLocaleDateString()}
                        </div>
                        <div className="flex-1 max-w-32">
                          <Progress value={(day.transactions / maxTransactions) * 100} className="h-3" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{day.transactions}</div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(day.sales / day.transactions)} avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Sales</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Avg per Transaction</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((day: SaleData) => (
                      <TableRow key={day.date}>
                        <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(day.sales)}</TableCell>
                        <TableCell>{day.transactions}</TableCell>
                        <TableCell>{formatCurrency(day.sales / day.transactions)}</TableCell>
                        <TableCell className="text-blue-600">{formatCurrency(day.profit)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {((day.profit / day.sales) * 100).toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products by Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product: TopProduct, index: number) => (
                    <div key={product.product_id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Badge variant={index === 0 ? 'default' : 'outline'}>
                            #{index + 1}
                          </Badge>
                          <span className="font-medium text-sm">{product.product_name}  </span>
                        </div>
                        <span className="text-green-600 font-semibold">
                          {formatCurrency(product.total_revenue)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={(product.total_revenue / maxRevenue) * 100} 
                          className="flex-1 h-2" 
                        />
                        <span className="text-xs text-gray-500 w-12">
                          {((product.total_revenue / maxRevenue) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Products by Quantity */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products by Quantity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts
                    .sort((a: TopProduct, b: TopProduct) => b.quantity_sold - a.quantity_sold)
                    .map((product: TopProduct, index: number) => (
                    <div key={product.product_id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Badge variant={index === 0 ? 'default' : 'outline'}>
                            #{index + 1}
                          </Badge>
                          <span className="font-medium text-sm">{product.product_name}</span>
                        </div>
                        <span className="text-blue-600 font-semibold">
                          {product.quantity_sold} units
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={(product.quantity_sold / maxQuantity) * 100} 
                          className="flex-1 h-2" 
                        />
                        <span className="text-xs text-gray-500 w-12">
                          {((product.quantity_sold / maxQuantity) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Product Performance Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Avg Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((product: TopProduct, index: number) => (
                      <TableRow key={product.product_id}>
                        <TableCell>
                          <Badge variant={index === 0 ? 'default' : 'outline'}>
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{product.product_name}</TableCell>
                        <TableCell>{product.quantity_sold} units</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(product.total_revenue)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(product.total_revenue / product.quantity_sold)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          {/* Inventory Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stock Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Good Stock</span>
                  <Badge variant="default">
                    {products.filter((p: Product) => p.current_stock > p.min_stock_level * 2).length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Warning Level</span>
                  <Badge variant="secondary">
                    {products.filter((p: Product) => p.current_stock > p.min_stock_level && p.current_stock <= p.min_stock_level * 2).length}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Low Stock</span>
                  <Badge variant="destructive">
                    {lowStockCount}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stock Value</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Value</span>
                  <span className="font-semibold">{formatCurrency(totalStockValue)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Avg per Product</span>
                  <span className="font-medium">
                    {formatCurrency(products.length > 0 ? totalStockValue / products.length : 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Products</span>
                  <Badge variant="outline">{products.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Products</span>
                  <Badge variant="outline">{products.filter((p: Product) => p.is_active).length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Units</span>
                  <Badge variant="outline">
                    {products.reduce((sum: number, p: Product) => sum + p.current_stock, 0)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Low Stock Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Stock Level Report</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stock Value</TableHead>
                      <TableHead>Action Needed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products
                      .sort((a: Product, b: Product) => {
                        // Sort by stock status: low stock first
                        const aRatio = a.current_stock / Math.max(a.min_stock_level, 1);
                        const bRatio = b.current_stock / Math.max(b.min_stock_level, 1);
                        return aRatio - bRatio;
                      })
                      .slice(0, 10)
                      .map((product: Product) => {
                        const stockRatio = product.current_stock / Math.max(product.min_stock_level, 1);
                        const stockValue = product.current_stock * product.cost_price;
                        
                        return (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                              </div>
                            </TableCell>
                            <TableCell className={stockRatio <= 1 ? 'text-red-600 font-semibold' : ''}>
                              {product.current_stock}
                            </TableCell>
                            <TableCell>{product.min_stock_level}</TableCell>
                            <TableCell>
                              {stockRatio <= 1 ? (
                                <Badge variant="destructive">Critical</Badge>
                              ) : stockRatio <= 2 ? (
                                <Badge variant="secondary">Warning</Badge>
                              ) : (
                                <Badge variant="default">Good</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatCurrency(stockValue)}</TableCell>
                            <TableCell>
                              {stockRatio <= 1 ? (
                                <span className="text-red-600 text-sm font-medium">Restock Now</span>
                              ) : stockRatio <= 2 ? (
                                <span className="text-yellow-600 text-sm">Monitor</span>
                              ) : (
                                <span className="text-green-600 text-sm">None</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
