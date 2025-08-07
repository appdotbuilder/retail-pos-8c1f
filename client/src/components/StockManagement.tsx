
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Package, TrendingUp, TrendingDown, RotateCcw, Search, Plus } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, User, StockMovement, CreateStockMovementInput, StockMovementType } from '../../../server/src/schema';

interface StockManagementProps {
  products: Product[];
  currentUser: User;
  lowStockProducts: Product[];
  onStockChange: () => void;
}

export function StockManagement({ products, currentUser, lowStockProducts, onStockChange }: StockManagementProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingMovement, setIsAddingMovement] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Stock movement form state
  const [movementFormData, setMovementFormData] = useState<CreateStockMovementInput>({
    product_id: 0,
    movement_type: 'in',
    quantity: 0,
    notes: null,
    created_by: currentUser.id
  });

  // Filter products for low stock
  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset movement form
  const resetMovementForm = useCallback(() => {
    setMovementFormData({
      product_id: 0,
      movement_type: 'in',
      quantity: 0,
      notes: null,
      created_by: currentUser.id
    });
  }, [currentUser.id]);

  // Load stock movements for a product
  const loadStockMovements = useCallback(async (productId: number) => {
    setIsLoading(true);
    try {
      const movements = await trpc.getStockMovements.query({ productId });
      setStockMovements(movements);
    } catch (error) {
      console.error('Failed to load stock movements:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle product selection for viewing movements
  const selectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    loadStockMovements(product.id);
  }, [loadStockMovements]);

  // Handle stock movement submission
  const handleMovementSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (movementFormData.product_id === 0) {
      alert('Please select a product');
      return;
    }

    if (movementFormData.quantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setIsProcessing(true);
    
    try {
      await trpc.createStockMovement.mutate(movementFormData);
      setIsAddingMovement(false);
      resetMovementForm();
      onStockChange();
      
      // Refresh movements if viewing a product
      if (selectedProduct) {
        loadStockMovements(selectedProduct.id);
      }
    } catch (error) {
      console.error('Failed to create stock movement:', error);
      alert('Failed to create stock movement. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [movementFormData, resetMovementForm, onStockChange, selectedProduct, loadStockMovements]);

  // Quick adjustment functions
  const quickAdjustment = useCallback((product: Product, type: StockMovementType) => {
    setMovementFormData({
      product_id: product.id,
      movement_type: type,
      quantity: 1,
      notes: `Quick ${type} adjustment`,
      created_by: currentUser.id
    });
    setIsAddingMovement(true);
  }, [currentUser.id]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Stock Overview</span>
          </TabsTrigger>
          <TabsTrigger value="low-stock" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Low Stock ({lowStockProducts.length})</span>
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center space-x-2">
            <RotateCcw className="h-4 w-4" />
            <span>Stock Movements</span>
          </TabsTrigger>
        </TabsList>

        {/* Stock Overview */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5" />
                  <span>Stock Overview</span>
                </CardTitle>
                
                <Dialog open={isAddingMovement} onOpenChange={setIsAddingMovement}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Stock Movement</span>
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Stock Movement</DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleMovementSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="product">Product</Label>
                        <Select 
                          value={movementFormData.product_id.toString() || ''} 
                          onValueChange={(value: string) => 
                            setMovementFormData((prev: CreateStockMovementInput) => ({ 
                              ...prev, 
                              product_id: parseInt(value) 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product: Product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} (Stock: {product.current_stock})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="movement_type">Movement Type</Label>
                        <Select 
                          value={movementFormData.movement_type} 
                          onValueChange={(value: StockMovementType) => 
                            setMovementFormData((prev: CreateStockMovementInput) => ({ 
                              ...prev, 
                              movement_type: value 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in">📈 Stock In (Add)</SelectItem>
                            <SelectItem value="out">📉 Stock Out (Remove)</SelectItem>
                            <SelectItem value="adjustment">🔄 Adjustment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={movementFormData.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setMovementFormData((prev: CreateStockMovementInput) => ({ 
                              ...prev, 
                              quantity: parseInt(e.target.value) || 0 
                            }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={movementFormData.notes || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setMovementFormData((prev: CreateStockMovementInput) => ({ 
                              ...prev, 
                              notes: e.target.value || null 
                            }))
                          }
                          placeholder="Reason for stock movement..."
                        />
                      </div>

                      <div className="flex space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddingMovement(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isProcessing} className="flex-1">
                          {isProcessing ? 'Processing...' : 'Create Movement'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Products Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Quick Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No products found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product: Product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${
                              product.current_stock <= product.min_stock_level 
                                ? 'text-red-600' 
                                : product.current_stock <= product.min_stock_level * 2
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}>
                              {product.current_stock}
                            </span>
                          </TableCell>
                          <TableCell>{product.min_stock_level}</TableCell>
                          <TableCell>
                            {product.current_stock <= product.min_stock_level ? (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Low Stock
                              </Badge>
                            ) : product.current_stock <= product.min_stock_level * 2 ? (
                              <Badge variant="secondary">Warning</Badge>
                            ) : (
                              <Badge variant="default">Good</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => quickAdjustment(product, 'in')}
                                className="flex items-center space-x-1"
                              >
                                <TrendingUp className="h-3 w-3" />
                                <span>Add</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => quickAdjustment(product, 'out')}
                                className="flex items-center space-x-1"
                              >
                                <TrendingDown className="h-3 w-3" />
                                <span>Remove</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => selectProduct(product)}
                              >
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock Tab */}
        <TabsContent value="low-stock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span>Low Stock Products</span>
                <Badge variant="destructive">{lowStockProducts.length}</Badge>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {lowStockProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No low stock products! 🎉</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lowStockProducts.map((product: Product) => (
                    <Card key={product.id} className="border-red-200 bg-red-50">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                          </div>
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Current Stock:</span>
                          <span className="font-semibold text-red-600">{product.current_stock}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Min Level:</span>
                          <span className="font-medium">{product.min_stock_level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Shortage:</span>
                          <span className="font-semibold text-red-600">
                            {Math.max(0, product.min_stock_level - product.current_stock)} units
                          </span>
                        </div>
                        
                        <div className="flex space-x-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => quickAdjustment(product, 'in')}
                            className="flex-1"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Restock
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => selectProduct(product)}
                          >
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RotateCcw className="h-5 w-5" />
                <span>Stock Movements</span>
                {selectedProduct && (
                  <Badge variant="outline">
                    {selectedProduct.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {!selectedProduct ? (
                <div className="text-center py-8">
                  <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a product from the Stock Overview to view movements</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Movement History</h3>
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedProduct(null)}
                    >
                      Clear Selection
                    </Button>
                  </div>

                  {isLoading ? (
                    <div className="text-center py-8">
                      <p>Loading movements...</p>
                    </div>
                  ) : stockMovements.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No movements found for this product</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead>Created By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockMovements.map((movement: StockMovement) => (
                            <TableRow key={movement.id}>
                              <TableCell>
                                {movement.created_at.toLocaleDateString()} {movement.created_at.toLocaleTimeString()}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={
                                    movement.movement_type === 'in' ? 'default' :
                                    movement.movement_type === 'out' ? 'destructive' : 'secondary'
                                  }
                                  className="flex items-center space-x-1 w-fit"
                                >
                                  {movement.movement_type === 'in' && <TrendingUp className="h-3 w-3" />}
                                  {movement.movement_type === 'out' && <TrendingDown className="h-3 w-3" />}
                                  {movement.movement_type === 'adjustment' && <RotateCcw className="h-3 w-3" />}
                                  <span className="capitalize">{movement.movement_type}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {movement.movement_type === 'out' ? '-' : '+'}{movement.quantity}
                              </TableCell>
                              <TableCell>
                                {movement.notes || <span className="text-gray-400">No notes</span>}
                              </TableCell>
                              <TableCell>
                                User #{movement.created_by}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
