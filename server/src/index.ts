
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createUserInputSchema,
  createCategoryInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  searchProductInputSchema,
  createSaleInputSchema,
  createStockMovementInputSchema,
  getReportInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUsers } from './handlers/get_users';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { updateProduct } from './handlers/update_product';
import { searchProducts } from './handlers/search_products';
import { createSale } from './handlers/create_sale';
import { getSales } from './handlers/get_sales';
import { createStockMovement } from './handlers/create_stock_movement';
import { getStockMovements } from './handlers/get_stock_movements';
import { getSalesReport } from './handlers/get_sales_report';
import { getLowStockProducts } from './handlers/get_low_stock_products';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  getUsers: publicProcedure
    .query(() => getUsers()),
  
  // Category management
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),
  getCategories: publicProcedure
    .query(() => getCategories()),
  
  // Product management
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),
  getProducts: publicProcedure
    .query(() => getProducts()),
  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),
  searchProducts: publicProcedure
    .input(searchProductInputSchema)
    .query(({ input }) => searchProducts(input)),
  getLowStockProducts: publicProcedure
    .query(() => getLowStockProducts()),
  
  // Sales management
  createSale: publicProcedure
    .input(createSaleInputSchema)
    .mutation(({ input }) => createSale(input)),
  getSales: publicProcedure
    .query(() => getSales()),
  
  // Stock management
  createStockMovement: publicProcedure
    .input(createStockMovementInputSchema)
    .mutation(({ input }) => createStockMovement(input)),
  getStockMovements: publicProcedure
    .input(z.object({ productId: z.number().optional() }))
    .query(({ input }) => getStockMovements(input.productId)),
  
  // Reports
  getSalesReport: publicProcedure
    .input(getReportInputSchema)
    .query(({ input }) => getSalesReport(input))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`POS TRPC server listening at port: ${port}`);
}

start();
