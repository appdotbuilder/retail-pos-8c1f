
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Sale, SalesReport, GetReportInput } from '../../../server/src/schema';

interface TopProduct {
  product_id: number;
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
}

export function ReportsModule() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportInput, setReportInput] = useState<GetReportInput>({
    start_date: new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
    end_date: new Date(),
    report_type: 'daily'
  });

  // Load sales
  const loadSales = useCallback(async () => {
    try {
      const result = await trpc.getSales.query();
      setSales(result);
    } catch (error) {
      console.error('Failed to load sales:', error);
    }
  }, []);

  // Load sales report
  const loadSalesReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getSalesReport.query(reportInput);
      setSalesReport(result);
    } catch (error) {
      console.error('Failed to load sales report:', error);
    } finally {
      setIsLoading(false);
    }
  }, [reportInput]);

  useEffect(() => {
    loadSales();
    loadSalesReport();
  }, [loadSales, loadSalesReport]);

  // Generate report
  const generateReport = () => {
    loadSalesReport();
  };

  // Get today's sales
  const todaysSales = sales.filter((sale: Sale) => {
    const saleDate = new Date(sale.created_at);
    const today = new Date();
    return saleDate.toDateString() === today.toDateString();
  });

  // Calculate metrics
  const todaysRevenue = todaysSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor your business performance</p>
        </div>
        <Button onClick={generateReport} disabled={isLoading}>
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <BarChart3 className="h-4 w-4 mr-2" />
          )}
          Generate Report
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${todaysRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {todaysSales.length} transactions today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              All time earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageTransaction.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Input
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
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Input
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
              <label className="block text-sm font-medium mb-1">Report Type</label>
              <Select
                value={reportInput.report_type || 'daily'}
                onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
                  setReportInput((prev: GetReportInput) => ({ ...prev, report_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={isLoading} className="w-full">
                {isLoading ? 'Loading...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="sales">Recent Sales</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sales Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {salesReport ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-gray-600">Period</p>
                    <p className="text-lg font-medium">
                      {reportInput.start_date.toLocaleDateString()} - {reportInput.end_date.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${salesReport.total_sales.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-gray-600">Transactions</p>
                    <p className="text-2xl font-bold">
                      {salesReport.total_transactions}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-gray-600">Total Profit</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${salesReport.total_profit.toFixed(2)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Generate a report to see summary data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Sales Transactions</CardTitle>
              <Button variant="outline" size="sm" disabled>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          No sales transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      sales.slice(0, 50).map((sale: Sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-sm">
                            {sale.transaction_id}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{sale.created_at.toLocaleDateString()}</p>
                              <p className="text-xs text-gray-500">{sale.created_at.toLocaleTimeString()}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {sale.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">${sale.total_amount.toFixed(2)}</span>
                          </TableCell>
                          <TableCell>
                            ${sale.change_given.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Top Selling Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesReport && salesReport.top_products.length > 0 ? (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesReport.top_products.map((product: TopProduct, index: number) => (
                        <TableRow key={product.product_id}>
                          <TableCell>
                            <div className="flex items-center">
                              <span className="text-lg font-bold text-gray-400">
                                #{index + 1}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{product.product_name}</p>
                            <p className="text-sm text-gray-500">ID: {product.product_id}</p>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{product.quantity_sold}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              ${product.total_revenue.toFixed(2)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No product sales data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
