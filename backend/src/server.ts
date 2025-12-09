import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyWebsocket from "@fastify/websocket";
import { env } from "./config/env.js";
import { jwtConfig } from "./config/jwt.js";
import logger from "./config/logger.js";
import { testConnection, closePool } from "./config/database.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { registerAuthDecorator } from "./middlewares/auth.js";
import {
  initializeWebSocketServer,
  wsSyncServer,
} from "./websocket/syncServer.js";

// Import routes
import authRoutes from "./routes/auth.js";
import licenseRoutes from "./routes/license.js";
import { syncRoutes } from "./routes/sync.js";
import productRoutes from "./routes/products.js";
import customerRoutes from "./routes/customers.js";
import invoiceRoutes from "./routes/invoices.js";
import categoryRoutes from "./routes/categories.js";
import supplierRoutes from "./routes/suppliers.js";
import paymentMethodRoutes from "./routes/payment-methods.js";
import employeeRoutes from "./routes/employees.js";
import expenseCategoryRoutes from "./routes/expense-categories.js";
import expenseRoutes from "./routes/expenses.js";
import purchaseRoutes from "./routes/purchases.js";

const fastify = Fastify({
  logger: logger,
  trustProxy: true,
  bodyLimit: 10485760, // 10MB
});

// Register plugins
async function registerPlugins() {
  // JWT
  await fastify.register(fastifyJwt, {
    secret: jwtConfig.secret,
    sign: {
      expiresIn: jwtConfig.accessExpiry,
    },
  });

  // CORS
  await fastify.register(fastifyCors, {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    credentials: true,
  });

  // Rate Limiting (except for sync endpoints)
  await fastify.register(fastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIMEWINDOW,
    skipOnError: true,
    allowList: (req) => {
      // Skip rate limiting for sync endpoints
      return req.url?.startsWith(`${env.API_PREFIX}/sync`) || false;
    },
  });

  // WebSocket
  await fastify.register(fastifyWebsocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  // Register auth decorator
  registerAuthDecorator(fastify);
}

// Register routes
async function registerRoutes() {
  // Health check
  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // Health with API prefix
  fastify.get(`${env.API_PREFIX}/health`, async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // API routes
  await fastify.register(authRoutes, { prefix: `${env.API_PREFIX}/auth` });
  await fastify.register(licenseRoutes, {
    prefix: `${env.API_PREFIX}/license`,
  });
  await fastify.register(syncRoutes, { prefix: `${env.API_PREFIX}/sync` });
  await fastify.register(productRoutes, {
    prefix: `${env.API_PREFIX}/products`,
  });
  await fastify.register(customerRoutes, {
    prefix: `${env.API_PREFIX}/customers`,
  });
  await fastify.register(invoiceRoutes, {
    prefix: `${env.API_PREFIX}/invoices`,
  });
  await fastify.register(categoryRoutes, {
    prefix: `${env.API_PREFIX}/categories`,
  });
  await fastify.register(supplierRoutes, {
    prefix: `${env.API_PREFIX}/suppliers`,
  });
  await fastify.register(paymentMethodRoutes, {
    prefix: `${env.API_PREFIX}/payment-methods`,
  });
  await fastify.register(employeeRoutes, {
    prefix: `${env.API_PREFIX}/employees`,
  });
  await fastify.register(expenseCategoryRoutes, {
    prefix: `${env.API_PREFIX}/expense-categories`,
  });
  await fastify.register(expenseRoutes, {
    prefix: `${env.API_PREFIX}/expenses`,
  });
  await fastify.register(purchaseRoutes, {
    prefix: `${env.API_PREFIX}/purchases`,
  });

  logger.info("✅ All routes registered successfully");
}

// Error handler
fastify.setErrorHandler(errorHandler);

// Graceful shutdown
async function gracefulShutdown() {
  logger.info("Received shutdown signal, closing server gracefully...");
  try {
    if (wsSyncServer) {
      await wsSyncServer.shutdown();
    }
    await fastify.close();
    await closePool();
    logger.info("✅ Server closed successfully");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start server
async function start() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error("Failed to connect to database");
    }

    // Register plugins
    await registerPlugins();

    // Register routes
    await registerRoutes();

    // Initialize WebSocket server
    await initializeWebSocketServer(fastify as any);

    // Start listening
    await fastify.listen({
      port: env.PORT,
      host: "127.0.0.1",
    });

    logger.info(`🚀 Server is running on http://localhost:${env.PORT}`);
    logger.info(`📡 WebSocket ready on ws://localhost:${env.WS_PORT}`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

start();
