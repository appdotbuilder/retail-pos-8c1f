
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Calculator } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Product, Category, User, CreateSaleInput, PaymentMethod } from '../../../server/src/schema';

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface SalesModuleProps {
  products: Product[];
  categories: Category[];
  currentUser: User;
  onSaleComplete: () => void;
}

interface SaleReceipt {
  transaction_id: string;
  created_at: Date;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_received: number;
  change_given: number;
  items: CartItem[];
}

export function SalesModule({ products, categories, currentUser, onSaleComplete }: SalesModuleProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReceived, setPaymentReceived] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<SaleReceipt | null>(null);

  // Filter products based on search and category
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
                           product.category_id === parseInt(selectedCategory);
    
    return matchesSearch && matchesCategory && product.is_active && product.current_stock > 0;
  });

  // Calculate totals
  const subtotal = cart.reduce((sum: number, item: CartItem) => sum + item.subtotal, 0);
  const total = subtotal; // Add tax calculation here if needed
  const change = paymentReceived - total;

  // Add product to cart
  const addToCart = useCallback((product: Product) => {
    setCart((prevCart: CartItem[]) => {
      const existingItem = prevCart.find((item: CartItem) => item.product.id === product.id);
      
      if (existingItem) {
        // Check stock availability
        if (existingItem.quantity >= product.current_stock) {
          alert('Insufficient stock');
          return prevCart;
        }
        
        return prevCart.map((item: CartItem) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.product.selling_price
              }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            product,
            quantity: 1,
            subtotal: product.selling_price
          }
        ];
      }
    });
  }, []);

  // Update cart item quantity
  const updateQuantity = useCallback((productId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart((prevCart: CartItem[]) => prevCart.filter((item: CartItem) => item.product.id !== productId));
    } else {
      setCart((prevCart: CartItem[]) => 
        prevCart.map((item: CartItem) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: Math.min(newQuantity, item.product.current_stock),
                subtotal: Math.min(newQuantity, item.product.current_stock) * item.product.selling_price
              }
            : item
        )
      );
    }
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((productId: number) => {
    setCart((prevCart: CartItem[]) => prevCart.filter((item: CartItem) => item.product.id !== productId));
  }, []);

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([]);
    setPaymentReceived(0);
  }, []);

  // Process sale
  const processSale = useCallback(async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (paymentReceived < total) {
      alert('Insufficient payment received');
      return;
    }

    setIsProcessing(true);
    
    try {
      const saleInput: CreateSaleInput = {
        cashier_id: currentUser.id,
        payment_method: paymentMethod,
        payment_received: paymentReceived,
        items: cart.map((item: CartItem) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.selling_price
        }))
      };

      const sale = await trpc.createSale.mutate(saleInput);
      
      const receipt: SaleReceipt = {
        transaction_id: sale.transaction_id,
        created_at: sale.created_at,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        payment_received: sale.payment_received,
        change_given: sale.change_given,
        items: cart
      };
      
      setLastSale(receipt);
      clearCart();
      onSaleComplete();
      setShowReceipt(true);
      
    } catch (error) {
      console.error('Failed to process sale:', error);
      alert('Failed to process sale. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [cart, paymentMethod, paymentReceived, total, currentUser.id, clearCart, onSaleComplete]);

  // Auto-calculate payment for exact amount
  const setExactAmount = useCallback(() => {
    setPaymentReceived(total);
  }, [total]);

  // Print receipt (placeholder implementation)
  const printReceipt = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Search & List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search Bar */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
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

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((product: Product) => (
            <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-sm">{product.name}</h3>
                  <Badge variant={product.current_stock > product.min_stock_level ? 'secondary' : 'destructive'}>
                    Stock: {product.current_stock}
                  </Badge>
                </div>
                
                <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-lg font-bold text-green-600">
                      ${product.selling_price.toFixed(2)}
                    </p>
                  </div>
                  
                  <Button 
                    size="sm" 
                    onClick={() => addToCart(product)}
                    disabled={product.current_stock === 0}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No products found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Shopping Cart & Checkout */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Shopping Cart</span>
              </span>
              <Badge variant="outline">{cart.length} items</Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.map((item: CartItem) => (
                    <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">${item.product.selling_price.toFixed(2)} each</p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.current_stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="text-right ml-2">
                        <p className="font-semibold text-sm">${item.subtotal.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Cart Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                <Separator />

                {/* Payment Section */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={(value: PaymentMethod) => setPaymentMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">💵 Cash</SelectItem>
                        <SelectItem value="card">💳 Card</SelectItem>
                        <SelectItem value="digital">📱 Digital</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Received</label>
                    <div className="flex space-x-2">
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
                      <Button variant="outline" size="sm" onClick={setExactAmount}>
                        <Calculator className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {paymentReceived > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Change:</span>
                      <span className={change < 0 ? 'text-red-600' : 'text-green-600'}>
                        ${change.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={clearCart} className="flex-1">
                    Clear Cart
                  </Button>
                  <Button 
                    onClick={processSale}
                    disabled={isProcessing || paymentReceived < total}
                    className="flex-1"
                  >
                    {isProcessing ? 'Processing...' : 'Complete Sale'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Receipt Dialog */}
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Sale Receipt</span>
              </DialogTitle>
            </DialogHeader>
            
            {lastSale && (
              <div className="space-y-4 text-sm">
                {/* Receipt Header */}
                <div className="text-center border-b pb-4">
                  <h2 className="text-lg font-bold">🏪 RetailPOS</h2>
                  <p>123 Main Street</p>
                  <p>City, State 12345</p>
                  <p>Tel: (555) 123-4567</p>
                </div>

                {/* Transaction Info */}
                <div className="border-b pb-4">
                  <div className="flex justify-between">
                    <span>Transaction ID:</span>
                    <span className="font-mono">{lastSale.transaction_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(lastSale.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{new Date(lastSale.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{currentUser.full_name}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold mb-2">Items:</h3>
                  {lastSale.items.map((item: CartItem) => (
                    <div key={item.product.id} className="flex justify-between mb-1">
                      <div>
                        <div>{item.product.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.quantity} × ${item.product.selling_price.toFixed(2)}
                        </div>
                      </div>
                      <div>${item.subtotal.toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                {/* Payment Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${lastSale.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${lastSale.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment ({lastSale.payment_method}):</span>
                    <span>${lastSale.payment_received.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span>${lastSale.change_given.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center border-t pt-4">
                  <p>Thank you for your purchase!</p>
                  <p className="text-xs">Please keep this receipt</p>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" onClick={printReceipt} className="flex-1">
                    🖨️ Print
                  </Button>
                  <Button onClick={() => setShowReceipt(false)} className="flex-1">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
