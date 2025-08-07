
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger,SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Package, Tag, Search } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, Category, CreateProductInput, CreateCategoryInput, UpdateProductInput } from '../../../server/src/schema';

interface ProductManagementProps {
  products: Product[];
  categories: Category[];
  onProductsChange: () => void;
  onCategoriesChange: () => void;
}

export function ProductManagement({ products, categories, onProductsChange, onCategoriesChange }: ProductManagementProps) {
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  // Product form state
  const [productFormData, setProductFormData] = useState<CreateProductInput>({
    name: '',
    sku: '',
    barcode: null,
    category_id: 0,
    selling_price: 0,
    cost_price: 0,
    initial_stock: 0,
    min_stock_level: 0
  });

  // Category form state
  const [categoryFormData, setCategoryFormData] = useState<CreateCategoryInput>({
    name: '',
    description: null
  });

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || 
                           product.category_id === parseInt(categoryFilter);
    
    return matchesSearch && matchesCategory;
  });

  // Reset product form
  const resetProductForm = useCallback(() => {
    setProductFormData({
      name: '',
      sku: '',
      barcode: null,
      category_id: 0,
      selling_price: 0,
      cost_price: 0,
      initial_stock: 0,
      min_stock_level: 0
    });
  }, []);

  // Reset category form
  const resetCategoryForm = useCallback(() => {
    setCategoryFormData({
      name: '',
      description: null
    });
  }, []);

  // Handle product form submission
  const handleProductSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (productFormData.category_id === 0) {
      alert('Please select a category');
      return;
    }

    setIsProcessing(true);
    
    try {
      if (editingProduct) {
        const updateData: UpdateProductInput = {
          id: editingProduct.id,
          name: productFormData.name,
          sku: productFormData.sku,
          barcode: productFormData.barcode,
          category_id: productFormData.category_id,
          selling_price: productFormData.selling_price,
          cost_price: productFormData.cost_price,
          min_stock_level: productFormData.min_stock_level
        };
        
        await trpc.updateProduct.mutate(updateData);
        setEditingProduct(null);
      } else {
        await trpc.createProduct.mutate(productFormData);
        setIsAddingProduct(false);
      }
      
      resetProductForm();
      onProductsChange();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [productFormData, editingProduct, resetProductForm, onProductsChange]);

  // Handle category form submission
  const handleCategorySubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      await trpc.createCategory.mutate(categoryFormData);
      setIsAddingCategory(false);
      resetCategoryForm();
      onCategoriesChange();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [categoryFormData, resetCategoryForm, onCategoriesChange]);

  // Start editing product
  const startEditingProduct = useCallback((product: Product) => {
    setProductFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category_id: product.category_id,
      selling_price: product.selling_price,
      cost_price: product.cost_price,
      initial_stock: product.current_stock,
      min_stock_level: product.min_stock_level
    });
    setEditingProduct(product);
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditingProduct(null);
    resetProductForm();
  }, [resetProductForm]);

  // Get category name
  const getCategoryName = useCallback((categoryId: number) => {
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.name || 'Unknown';
  }, [categories]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Products</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center space-x-2">
            <Tag className="h-4 w-4" />
            <span>Categories</span>
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Product Management</span>
                  </CardTitle>
                </div>
                
                <Dialog open={isAddingProduct || editingProduct !== null} onOpenChange={(open: boolean) => {
                  if (!open) {
                    setIsAddingProduct(false);
                    cancelEditing();
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setIsAddingProduct(true)} className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Product</span>
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleProductSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                          id="name"
                          value={productFormData.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setProductFormData((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          value={productFormData.sku}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setProductFormData((prev: CreateProductInput) => ({ ...prev, sku: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="barcode">Barcode (Optional)</Label>
                        <Input
                          id="barcode"
                          value={productFormData.barcode || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setProductFormData((prev: CreateProductInput) => ({ 
                              ...prev, 
                              barcode: e.target.value || null 
                            }))
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select 
                          value={productFormData.category_id.toString()} 
                          onValueChange={(value: string) => 
                            setProductFormData((prev: CreateProductInput) => ({ 
                              ...prev, 
                              category_id: parseInt(value) 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category: Category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cost_price">Cost Price</Label>
                          <Input
                            id="cost_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={productFormData.cost_price}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductFormData((prev: CreateProductInput) => ({ 
                                ...prev, 
                                cost_price: parseFloat(e.target.value) || 0 
                              }))
                            }
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="selling_price">Selling Price</Label>
                          <Input
                            id="selling_price"
                            type="number"
                            step="0.01"
                            min="0"
                            value={productFormData.selling_price}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductFormData((prev: CreateProductInput) => ({ 
                                ...prev, 
                                selling_price: parseFloat(e.target.value) || 0 
                              }))
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="initial_stock">Initial Stock</Label>
                          <Input
                            id="initial_stock"
                            type="number"
                            min="0"
                            value={productFormData.initial_stock}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductFormData((prev: CreateProductInput) => ({ 
                                ...prev, 
                                initial_stock: parseInt(e.target.value) || 0 
                              }))
                            }
                            required
                            disabled={editingProduct !== null}
                          />
                        </div>

                        <div>
                          <Label htmlFor="min_stock_level">Min Stock Level</Label>
                          <Input
                            id="min_stock_level"
                            type="number"
                            min="0"
                            value={productFormData.min_stock_level}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setProductFormData((prev: CreateProductInput) => ({ 
                                ...prev, 
                                min_stock_level: parseInt(e.target.value) || 0 
                              }))
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="flex space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={editingProduct ? cancelEditing : () => setIsAddingProduct(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isProcessing} className="flex-1">
                          {isProcessing ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Products Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Prices</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
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
                              {product.barcode && (
                                <p className="text-xs text-gray-400">Barcode: {product.barcode}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getCategoryName(product.category_id)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">${product.selling_price.toFixed(2)}</p>
                              <p className="text-sm text-gray-500">Cost: ${product.cost_price.toFixed(2)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className={`font-medium ${product.current_stock <= product.min_stock_level ? 'text-red-600' : ''}`}>
                                {product.current_stock}
                              </p>
                              <p className="text-xs text-gray-500">Min: {product.min_stock_level}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? 'default' : 'secondary'}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingProduct(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{product.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Tag className="h-5 w-5" />
                  <span>Category Management</span>
                </CardTitle>
                
                <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Category</span>
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="category-name">Category Name</Label>
                        <Input
                          id="category-name"
                          value={categoryFormData.name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCategoryFormData((prev: CreateCategoryInput) => ({ ...prev, name: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="category-description">Description (Optional)</Label>
                        <Input
                          id="category-description"
                          value={categoryFormData.description || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setCategoryFormData((prev: CreateCategoryInput) => ({ 
                              ...prev, 
                              description: e.target.value || null 
                            }))
                          }
                        />
                      </div>

                      <div className="flex space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsAddingCategory(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isProcessing} className="flex-1">
                          {isProcessing ? 'Creating...' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No categories created yet</p>
                  </div>
                ) : (
                  categories.map((category: Category) => {
                    const productCount = products.filter((p: Product) => p.category_id === category.id).length;
                    
                    return (
                      <Card key={category.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <Badge variant="outline">{productCount} products</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {category.description && (
                            <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Created: {category.created_at.toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
