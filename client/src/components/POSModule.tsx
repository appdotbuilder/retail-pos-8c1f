
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, User, CreateSaleInput, PaymentMethod, Sale } from '../../../server/src/schema';

interface CartItem {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  category_id: number;
  selling_price: number;
  cost_price: number;
  current_stock: number;
  min_stock_level: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  cartQuantity: number;
}

interface POSModuleProps {
  currentUser: User;
}

export function POSModule({ currentUser }: POSModuleProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReceived, setPaymentReceived] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load products
  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Search products
  const searchProducts = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadProducts();
      return;
    }

    try {
      const result = await trpc.searchProducts.query({
        query: searchQuery,
        limit: 20
      });
      setProducts(result);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [searchQuery, loadProducts]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchProducts();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchProducts]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.current_stock <= 0) {
      alert('Product is out of stock!');
      return;
    }

    setCart((prevCart: CartItem[]) => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.cartQuantity >= product.current_stock) {
          alert('Cannot add more items than available in stock!');
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, cartQuantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prevCart: CartItem[]) =>
      prevCart.map(item => {
        if (item.id === productId) {
          const maxQuantity = item.current_stock;
          const newQuantity = Math.min(quantity, maxQuantity);
          return { ...item, cartQuantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prevCart: CartItem[]) => prevCart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPaymentReceived(0);
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.cartQuantity), 0);
  const total = subtotal; // Add tax calculation here if needed
  const change = Math.max(0, paymentReceived - total);

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    if (paymentMethod === 'cash' && paymentReceived < total) {
      alert('Insufficient payment received!');
      return;
    }

    setIsProcessing(true);

    try {
      const saleInput: CreateSaleInput = {
        cashier_id: currentUser.id,
        payment_method: paymentMethod,
        payment_received: paymentMethod === 'cash' ? paymentReceived : total,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.cartQuantity,
          unit_price: item.selling_price
        }))
      };

      const sale: Sale = await trpc.createSale.mutate(saleInput);
      console.log('Sale processed:', sale);
      clearCart();
      loadProducts(); // Refresh to get updated stock levels
      alert('Sale processed successfully!');
    } catch (error) {
      console.error('Sale processing failed:', error);
      alert('Failed to process sale. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Search and List */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="h-5 w-5 mr-2" />
              Product Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Input
                placeholder="Search by name, SKU, or barcode..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => setSearchQuery('')} variant="outline">
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredProducts.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No products found</p>
                ) : (
                  filteredProducts.map((product: Product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => addToCart(product)}
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="font-bold text-green-600">
                            ${product.selling_price.toFixed(2)}
                          </span>
                          <Badge variant={product.current_stock > 0 ? 'secondary' : 'destructive'}>
                            Stock: {product.current_stock}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={product.current_stock <= 0}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Shopping Cart and Payment */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2" />
              Cart ({cart.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Cart is empty</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item: CartItem) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-gray-600">${item.selling_price.toFixed(2)} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.cartQuantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {cart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center">
                          <Banknote className="h-4 w-4 mr-2" />
                          Cash
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Card
                        </div>
                      </SelectItem>
                      <SelectItem value="digital">
                        <div className="flex items-center">
                          <Smartphone className="h-4 w-4 mr-2" />
                          Digital
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === 'cash' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Received</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentReceived}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPaymentReceived(parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                    />
                    {paymentReceived > 0 && (
                      <p className="text-sm mt-1">
                        Change: <span className="font-bold">${change.toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={processSale}
                  disabled={isProcessing || cart.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    'Processing...'
                  ) : (
                    <>
                      <Receipt className="h-4 w-4 mr-2" />
                      Process Sale
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
