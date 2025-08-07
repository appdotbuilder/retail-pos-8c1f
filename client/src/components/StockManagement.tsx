
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Edit3,
  AlertTriangle,
  History,
  Plus,
  Minus
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, StockMovement, User, CreateStockMovementInput, StockMovementType } from '../../../server/src/schema';

interface StockManagementProps {
  currentUser: User;
}

export function StockManagement({ currentUser }: StockManagementProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Stock adjustment form
  const [adjustmentForm, setAdjustmentForm] = useState<CreateStockMovementInput>({
    product_id: 0,
    movement_type: 'adjustment',
    quantity: 0,
    notes: null,
    created_by: currentUser.id
  });

  // Load data
  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  const loadLowStockProducts = useCallback(async () => {
    try {
      const result = await trpc.getLowStockProducts.query();
      setLowStockProducts(result);
    } catch (error) {
      console.error('Failed to load low stock products:', error);
    }
  }, []);

  const loadStockMovements = useCallback(async () => {
    try {
      const result = await trpc.getStockMovements.query({});
      setStockMovements(result);
    } catch (error) {
      console.error('Failed to load stock movements:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadLowStockProducts();
    loadStockMovements();
  }, [loadProducts, loadLowStockProducts, loadStockMovements]);

  // Stock adjustment
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustmentForm.quantity === 0) {
      alert('Please enter a quantity');
      return;
    }

    setIsLoading(true);
    try {
      await trpc.createStockMovement.mutate(adjustmentForm);
      alert('Stock adjustment recorded successfully!');
      setIsAdjustmentDialogOpen(false);
      setSelectedProduct(null);
      setAdjustmentForm({
        product_id: 0,
        movement_type: 'adjustment',
        quantity: 0,
        notes: null,
        created_by: currentUser.id
      });
      loadProducts();
      loadLowStockProducts();
      loadStockMovements();
    } catch (error) {
      console.error('Failed to record stock adjustment:', error);
      alert('Failed to record stock adjustment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start stock adjustment
  const startStockAdjustment = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentForm({
      product_id: product.id,
      movement_type: 'adjustment',
      quantity: 0,
      notes: null,
      created_by: currentUser.id
    });
    setIsAdjustmentDialogOpen(true);
  };

  // Get movement type icon
  const getMovementIcon = (type: StockMovementType) => {
    switch (type) {
      case 'in': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'out': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'adjustment': return <Edit3 className="h-4 w-4 text-blue-500" />;
    }
  };

  // Get movement type color
  const getMovementColor = (type: StockMovementType) => {
    switch (type) {
      case 'in': return 'bg-green-100 text-green-800';
      case 'out': return 'bg-red-100 text-red-800';
      case 'adjustment': return 'bg-blue-100 text-blue-800';
    }
  };

  // Get product name
  const getProductName = (productId: number) => {
    const product = products.find((p: Product) => p.id === productId);
    return product ? product.name : `Product #${productId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-600 mt-1">Monitor and adjust your inventory levels</p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              Active products in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Products below minimum level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${products.reduce((sum, p) => sum + (p.current_stock * p.cost_price), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on cost prices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Stock Overview</TabsTrigger>
          <TabsTrigger value="lowstock">Low Stock</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>

        {/* Stock Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                All Products Stock Levels
              </CardTitle>
              <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Stock Adjustment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Stock Adjustment</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleStockAdjustment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Product</label>
                      <Select
                        value={selectedProduct ? selectedProduct.id.toString() : ''}
                        onValueChange={(value: string) => {
                          const product = products.find((p: Product) => p.id === parseInt(value));
                          if (product) {
                            setSelectedProduct(product);
                            setAdjustmentForm((prev: CreateStockMovementInput) => ({
                              ...prev,
                              product_id: product.id
                            }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product: Product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - Current: {product.current_stock}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedProduct && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">
                          <span className="font-medium">Current Stock:</span> {selectedProduct.current_stock}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Min Level:</span> {selectedProduct.min_stock_level}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1">Adjustment Type</label>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant={adjustmentForm.quantity > 0 ? 'default' : 'outline'}
                          onClick={() => setAdjustmentForm((prev: CreateStockMovementInput) => ({
                            ...prev,
                            quantity: Math.abs(prev.quantity)
                          }))}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Stock
                        </Button>
                        <Button
                          type="button"
                          variant={adjustmentForm.quantity < 0 ? 'default' : 'outline'}
                          onClick={() => setAdjustmentForm((prev: CreateStockMovementInput) => ({
                            ...prev,
                            quantity: -Math.abs(prev.quantity)
                          }))}
                          className="flex-1"
                        >
                          <Minus className="h-4 w-4 mr-2" />
                          Remove Stock
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        value={Math.abs(adjustmentForm.quantity)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const value = parseInt(e.target.value) || 0;
                          setAdjustmentForm((prev: CreateStockMovementInput) => ({
                            ...prev,
                            quantity: prev.quantity < 0 ? -value : value
                          }));
                        }}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <Textarea
                        value={adjustmentForm.notes || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setAdjustmentForm((prev: CreateStockMovementInput) => ({ 
                            ...prev, 
                            notes: e.target.value || null 
                          }))
                        }
                        placeholder="Reason for adjustment..."
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsAdjustmentDialogOpen(false);
                          setSelectedProduct(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading || !selectedProduct}>
                        {isLoading ? 'Recording...' : 'Record Adjustment'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Level</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                          No products found
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((product: Product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{product.current_stock}</span>
                              {product.current_stock <= product.min_stock_level && (
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{product.min_stock_level}</TableCell>
                          <TableCell>
                            ${(product.current_stock * product.cost_price).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {product.current_stock <= 0 ? (
                              <Badge variant="destructive">Out of Stock</Badge>
                            ) : product.current_stock <= product.min_stock_level ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                In Stock
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startStockAdjustment(product)}
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Adjust
                            </Button>
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

        {/* Low Stock Tab */}
        <TabsContent value="lowstock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                Low Stock Products ({lowStockProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">All products are well stocked!</p>
                  <p className="text-sm">No products are below their minimum stock level.</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Min Level</TableHead>
                        <TableHead>Deficit</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockProducts.map((product: Product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-orange-600">
                              {product.current_stock}
                            </span>
                          </TableCell>
                          <TableCell>{product.min_stock_level}</TableCell>
                          <TableCell>
                            <span className="font-medium text-red-600">
                              {product.min_stock_level - product.current_stock}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => startStockAdjustment(product)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Restock
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Recent Stock Movements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockMovements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                          No stock movements recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockMovements.slice(0, 50).map((movement: StockMovement) => (
                        <TableRow key={movement.id}>
                          <TableCell>
                            {movement.created_at.toLocaleDateString()} {movement.created_at.toLocaleTimeString()}
                          </TableCell>
                          <TableCell>{getProductName(movement.product_id)}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getMovementIcon(movement.movement_type)}
                              <Badge className={getMovementColor(movement.movement_type)}>
                                {movement.movement_type.toUpperCase()}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                            </span>
                          </TableCell>
                          <TableCell>
                            {movement.notes || '-'}
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
      </Tabs>
    </div>
  );
}
