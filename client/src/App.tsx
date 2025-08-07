
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Package, Users, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import components
import { SalesModule } from '@/components/SalesModule';
import { ProductManagement } from '@/components/ProductManagement';
import { UserManagement } from '@/components/UserManagement';
import { StockManagement } from '@/components/StockManagement';
import { Reports } from '@/components/Reports';

// Import types
import type { Product, Category, User } from '../../server/src/schema';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [currentUser] = useState<User>({
    id: 1,
    username: 'admin',
    email: 'admin@pos.com',
    password_hash: '',
    full_name: 'System Admin',
    role: 'admin',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  }); // Current user - in real app would come from authentication

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [productsData, categoriesData, usersData, lowStockData] = await Promise.all([
        trpc.getProducts.query(),
        trpc.getCategories.query(),
        trpc.getUsers.query(),
        trpc.getLowStockProducts.query()
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
      setUsers(usersData);
      setLowStockProducts(lowStockData);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshProducts = useCallback(async () => {
    try {
      const [productsData, lowStockData] = await Promise.all([
        trpc.getProducts.query(),
        trpc.getLowStockProducts.query()
      ]);
      setProducts(productsData);
      setLowStockProducts(lowStockData);
    } catch (error) {
      console.error('Failed to refresh products:', error);
    }
  }, []);

  const refreshCategories = useCallback(async () => {
    try {
      const categoriesData = await trpc.getCategories.query();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to refresh categories:', error);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const usersData = await trpc.getUsers.query();
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to refresh users:', error);
    }
  }, []);

  // Check user permissions
  const canAccessProducts = currentUser.role === 'admin' || currentUser.role === 'stock_manager';
  const canAccessUsers = currentUser.role === 'admin';
  const canAccessReports = currentUser.role === 'admin' || currentUser.role === 'stock_manager';
  const canAccessStock = currentUser.role === 'admin' || currentUser.role === 'stock_manager';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🏪 RetailPOS</h1>
                <p className="text-sm text-gray-600">Point of Sale System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {lowStockProducts.length > 0 && (
                <Badge variant="destructive" className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{lowStockProducts.length} Low Stock Items</span>
                </Badge>
              )}
              
              <div className="text-right">
                <p className="font-medium text-gray-900">{currentUser.full_name}</p>
                <p className="text-sm text-gray-500 capitalize">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
              <p className="text-xs text-muted-foreground">
                {products.filter((p: Product) => p.is_active).length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-muted-foreground">Product categories</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{lowStockProducts.length}</div>
              <p className="text-xs text-muted-foreground">Items need restock</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.filter((u: User) => u.is_active).length}</div>
              <p className="text-xs text-muted-foreground">System users</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="sales" className="flex items-center space-x-2">
              <ShoppingCart className="h-4 w-4" />
              <span>Sales (POS)</span>
            </TabsTrigger>
            
            {canAccessProducts && (
              <TabsTrigger value="products" className="flex items-center space-x-2">
                <Package className="h-4 w-4" />
                <span>Products</span>
              </TabsTrigger>
            )}
            
            {canAccessStock && (
              <TabsTrigger value="stock" className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4" />
                <span>Stock</span>
              </TabsTrigger>
            )}
            
            {canAccessUsers && (
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </TabsTrigger>
            )}
            
            {canAccessReports && (
              <TabsTrigger value="reports" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Reports</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Sales Module */}
          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Point of Sale</span>
                </CardTitle>
                <CardDescription>
                  Process sales transactions, manage cart, and generate receipts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SalesModule 
                  products={products}
                  categories={categories}
                  currentUser={currentUser}
                  onSaleComplete={refreshProducts}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Management */}
          {canAccessProducts && (
            <TabsContent value="products" className="space-y-6">
              <ProductManagement 
                products={products}
                categories={categories}
                onProductsChange={refreshProducts}
                onCategoriesChange={refreshCategories}
              />
            </TabsContent>
          )}

          {/* Stock Management */}
          {canAccessStock && (
            <TabsContent value="stock" className="space-y-6">
              <StockManagement 
                products={products}
                currentUser={currentUser}
                lowStockProducts={lowStockProducts}
                onStockChange={refreshProducts}
              />
            </TabsContent>
          )}

          {/* User Management */}
          {canAccessUsers && (
            <TabsContent value="users" className="space-y-6">
              <UserManagement 
                users={users}
                onUsersChange={refreshUsers}
              />
            </TabsContent>
          )}

          {/* Reports */}
          {canAccessReports && (
            <TabsContent value="reports" className="space-y-6">
              <Reports products={products} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

export default App;
