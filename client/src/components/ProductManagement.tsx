
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Tag,
  Search,
  AlertTriangle
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, Category, CreateProductInput, CreateCategoryInput } from '../../../server/src/schema';

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState<CreateProductInput>({
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
  const [categoryForm, setCategoryForm] = useState<CreateCategoryInput>({
    name: '',
    description: null
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

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  // Create/Update product
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (productForm.category_id === 0) {
      alert('Please select a category');
      return;
    }

    setIsLoading(true);
    try {
      if (editingProduct) {
        // Update product
        await trpc.updateProduct.mutate({
          id: editingProduct.id,
          ...productForm
        });
        alert('Product updated successfully!');
      } else {
        // Create product
        await trpc.createProduct.mutate(productForm);
        alert('Product created successfully!');
      }
      
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        sku: '',
        barcode: null,
        category_id: 0,
        selling_price: 0,
        cost_price: 0,
        initial_stock: 0,
        min_stock_level: 0
      });
      loadProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create category
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.createCategory.mutate(categoryForm);
      alert('Category created successfully!');
      setIsCategoryDialogOpen(false);
      setCategoryForm({
        name: '',
        description: null
      });
      loadCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
      alert('Failed to create category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Edit product
  const startEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category_id: product.category_id,
      selling_price: product.selling_price,
      cost_price: product.cost_price,
      initial_stock: product.current_stock,
      min_stock_level: product.min_stock_level
    });
    setIsProductDialogOpen(true);
  };

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get category name
  const getCategoryName = (categoryId: number) => {
    const category = categories.find((cat: Category) => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600 mt-1">Manage your inventory and product catalog</p>
        </div>
        <div className="flex space-x-3">
          <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Tag className="h-4 w-4 mr-2" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category Name</label>
                  <Input
                    value={categoryForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCategoryForm((prev: CreateCategoryInput) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <Textarea
                    value={categoryForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCategoryForm((prev: CreateCategoryInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                    placeholder="Optional description..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Category'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit Product' : 'Create New Product'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Product Name</label>
                    <Input
                      value={productForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setProductForm((prev: CreateProductInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">SKU</label>
                    <Input
                      value={productForm.sku}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setProductForm((prev: CreateProductInput) => ({ ...prev, sku: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Barcode</label>
                    <Input
                      value={productForm.barcode || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setProductForm((prev: CreateProductInput) => ({ 
                          ...prev, 
                          barcode: e.target.value || null 
                        }))
                      }
                      placeholder="Optional barcode"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <Select
                      value={productForm.category_id.toString()}
                      onValueChange={(value: string) =>
                        setProductForm((prev: CreateProductInput) => ({ 
                          ...prev, 
                          category_id: parseInt(value) 
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Selling Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.selling_price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setProductForm((prev: CreateProductInput) => ({ 
                          ...prev, 
                          selling_price: parseFloat(e.target.value) || 0 
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cost Price</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.cost_price}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setProductForm((prev: CreateProductInput) => ({ 
                          ...prev, 
                          cost_price: parseFloat(e.target.value) || 0 
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {editingProduct ? 'Current Stock' : 'Initial Stock'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={productForm.initial_stock}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setProductForm((prev: CreateProductInput) => ({ 
                          ...prev, 
                          initial_stock: parseInt(e.target.value) || 0 
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Minimum Stock Level</label>
                    <Input
                      type="number"
                      min="0"
                      value={productForm.min_stock_level}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setProductForm((prev: CreateProductInput) => ({ 
                          ...prev, 
                          min_stock_level: parseInt(e.target.value) || 0 
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsProductDialogOpen(false);
                      setEditingProduct(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Products ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product: Product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          {product.barcode && (
                            <p className="text-xs text-gray-500">Barcode: {product.barcode}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>{getCategoryName(product.category_id)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">${product.selling_price.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">Cost: ${product.cost_price.toFixed(2)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{product.current_stock}</span>
                          {product.current_stock <= product.min_stock_level && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'secondary' : 'destructive'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditProduct(product)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-3 w-3" />
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
                                <AlertDialogAction>Delete</AlertDialogAction>
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
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
