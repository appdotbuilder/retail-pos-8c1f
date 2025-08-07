
import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Settings,
  LogOut,
  Store
} from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import our main modules
import { POSModule } from '@/components/POSModule';
import { ProductManagement } from '@/components/ProductManagement';
import { StockManagement } from '@/components/StockManagement';
import { UserManagement } from '@/components/UserManagement';
import { ReportsModule } from '@/components/ReportsModule';

// Import types
import type { User, UserRole } from '../../server/src/schema';

function App() {
  // Current user from authentication system
  const [currentUser] = useState<User>({
    id: 1,
    username: 'admin',
    email: 'admin@store.com',
    password_hash: '',
    full_name: 'Store Administrator',
    role: 'admin',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date()
  });

  const [activeTab, setActiveTab] = useState('pos');
  const [isLoading, setIsLoading] = useState(true);

  // Health check on startup
  const checkConnection = useCallback(async () => {
    try {
      await trpc.healthcheck.query();
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to connect to server:', error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Role-based access control
  const hasAccess = (requiredRoles: UserRole[]) => {
    return requiredRoles.includes(currentUser.role);
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'cashier': return 'bg-blue-500';
      case 'stock_manager': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getAvailableTabs = () => {
    const tabs = [];
    
    // POS - available to admin and cashier
    if (hasAccess(['admin', 'cashier'])) {
      tabs.push({ id: 'pos', label: 'Point of Sale', icon: ShoppingCart });
    }
    
    // Products - available to admin and stock_manager
    if (hasAccess(['admin', 'stock_manager'])) {
      tabs.push({ id: 'products', label: 'Products', icon: Package });
    }
    
    // Stock - available to admin and stock_manager
    if (hasAccess(['admin', 'stock_manager'])) {
      tabs.push({ id: 'stock', label: 'Stock', icon: Settings });
    }
    
    // Users - admin only
    if (hasAccess(['admin'])) {
      tabs.push({ id: 'users', label: 'Users', icon: Users });
    }
    
    // Reports - available to all roles
    tabs.push({ id: 'reports', label: 'Reports', icon: BarChart3 });
    
    return tabs;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Connecting to POS System...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableTabs = getAvailableTabs();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">RetailPOS</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className={`${getRoleColor(currentUser.role)} text-white`}>
                {currentUser.role.replace('_', ' ').toUpperCase()}
              </Badge>
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{currentUser.full_name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-700">{currentUser.full_name}</span>
              </div>
              <Button variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl mx-auto mb-8">
            {availableTabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center space-x-2"
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {hasAccess(['admin', 'cashier']) && (
            <TabsContent value="pos" className="space-y-6">
              <POSModule currentUser={currentUser} />
            </TabsContent>
          )}

          {hasAccess(['admin', 'stock_manager']) && (
            <TabsContent value="products" className="space-y-6">
              <ProductManagement />
            </TabsContent>
          )}

          {hasAccess(['admin', 'stock_manager']) && (
            <TabsContent value="stock" className="space-y-6">
              <StockManagement currentUser={currentUser} />
            </TabsContent>
          )}

          {hasAccess(['admin']) && (
            <TabsContent value="users" className="space-y-6">
              <UserManagement />
            </TabsContent>
          )}

          <TabsContent value="reports" className="space-y-6">
            <ReportsModule />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
