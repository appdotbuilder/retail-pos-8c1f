
import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'cashier', 'stock_manager']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Payment method enum
export const paymentMethodSchema = z.enum(['cash', 'card', 'digital']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

// Stock movement type enum
export const stockMovementTypeSchema = z.enum(['in', 'out', 'adjustment']);
export type StockMovementType = z.infer<typeof stockMovementTypeSchema>;

// User schemas
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

export const createUserInputSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string(),
  role: userRoleSchema
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Category schemas
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Category = z.infer<typeof categorySchema>;

export const createCategoryInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

// Product schemas
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  sku: z.string(),
  barcode: z.string().nullable(),
  category_id: z.number(),
  selling_price: z.number(),
  cost_price: z.number(),
  current_stock: z.number().int(),
  min_stock_level: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string(),
  sku: z.string(),
  barcode: z.string().nullable(),
  category_id: z.number(),
  selling_price: z.number().positive(),
  cost_price: z.number().positive(),
  initial_stock: z.number().int().nonnegative(),
  min_stock_level: z.number().int().nonnegative().default(0)
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().nullable().optional(),
  category_id: z.number().optional(),
  selling_price: z.number().positive().optional(),
  cost_price: z.number().positive().optional(),
  min_stock_level: z.number().int().nonnegative().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Sale schemas
export const saleSchema = z.object({
  id: z.number(),
  transaction_id: z.string(),
  cashier_id: z.number(),
  total_amount: z.number(),
  payment_method: paymentMethodSchema,
  payment_received: z.number(),
  change_given: z.number(),
  created_at: z.coerce.date()
});

export type Sale = z.infer<typeof saleSchema>;

export const saleItemSchema = z.object({
  id: z.number(),
  sale_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number(),
  total_price: z.number()
});

export type SaleItem = z.infer<typeof saleItemSchema>;

export const createSaleInputSchema = z.object({
  cashier_id: z.number(),
  payment_method: paymentMethodSchema,
  payment_received: z.number().positive(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive()
  }))
});

export type CreateSaleInput = z.infer<typeof createSaleInputSchema>;

// Stock movement schemas
export const stockMovementSchema = z.object({
  id: z.number(),
  product_id: z.number(),
  movement_type: stockMovementTypeSchema,
  quantity: z.number().int(),
  reference_id: z.number().nullable(),
  notes: z.string().nullable(),
  created_by: z.number(),
  created_at: z.coerce.date()
});

export type StockMovement = z.infer<typeof stockMovementSchema>;

export const createStockMovementInputSchema = z.object({
  product_id: z.number(),
  movement_type: stockMovementTypeSchema,
  quantity: z.number().int(),
  notes: z.string().nullable(),
  created_by: z.number()
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementInputSchema>;

// Report schemas
export const salesReportSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  total_sales: z.number(),
  total_transactions: z.number(),
  total_profit: z.number(),
  top_products: z.array(z.object({
    product_id: z.number(),
    product_name: z.string(),
    quantity_sold: z.number(),
    total_revenue: z.number()
  }))
});

export type SalesReport = z.infer<typeof salesReportSchema>;

export const getReportInputSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  report_type: z.enum(['daily', 'weekly', 'monthly'])
});

export type GetReportInput = z.infer<typeof getReportInputSchema>;

// Search schemas
export const searchProductInputSchema = z.object({
  query: z.string(),
  category_id: z.number().optional(),
  limit: z.number().int().positive().default(10)
});

export type SearchProductInput = z.infer<typeof searchProductInputSchema>;
