const fastify = require('fastify')({
  logger: {
    level: 'info'
  }
});

require("dotenv").config();
const db = require("./models");

// Register CORS plugin
fastify.register(require("@fastify/cors"), {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
});

// ✅ FIXED: Register both form and JSON body parsers
fastify.register(require('@fastify/formbody'));
fastify.register(require('@fastify/multipart')); // For multipart forms if needed

// ✅ DEBUG: Add route registration tracking
fastify.addHook('onRoute', (routeOptions) => {
  console.log(`✅ Route registered: ${routeOptions.method} ${routeOptions.path}`);
});

// ✅ DEBUG: Add request tracking
fastify.addHook('onRequest', async (request, reply) => {
  console.log(`📝 Incoming: ${request.method} ${request.url}`);
});

// ✅ IMPORTANT: Fastify has built-in JSON parser, but ensure it's working
// Add this to debug body parsing
fastify.addHook('preHandler', async (request, reply) => {
  if (request.method === 'POST' || request.method === 'PUT') {
    fastify.log.info('Request Body:', request.body);
    fastify.log.info('Request Headers:', request.headers);
    fastify.log.info('Content-Type:', request.headers['content-type']);
  }
});

// ✅ IMPORTANT: Register test route BEFORE other routes to ensure it's available
fastify.post("/test-post", async (request, reply) => {
  console.log("🚀 TEST POST RECEIVED:", request.body);
  console.log("🚀 Headers:", request.headers);
  return reply.send({
    message: "POST is working!",
    body: request.body,
    headers: request.headers,
    timestamp: new Date().toISOString()
  });
});

// Health check route
fastify.get("/health", async (request, reply) => {
  try {
    await db.sequelize.authenticate();
    return reply.code(200).send({
      status: "healthy",
      timeStamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    return reply.code(503).send({
      status: "unhealthy",
      timeStamp: new Date().toISOString(),
      database: "disconnected",
      error: error.message,
    });
  }
});

// ✅ IMPROVED: Better route registration with error handling
async function registerRoutes(fastify) {
  try {
    await fastify.register(require('./routes/terms'), { prefix: '/api' });
    await fastify.register(require('./routes/products'), { prefix: '/api' });
    console.log('✅ API routes registered successfully');
  } catch (error) {
    console.error('❌ Error registering routes:', error);
    throw error;
  }
}

// Register the routes
fastify.register(registerRoutes);

// ✅ IMPROVED: Better error handler
fastify.setErrorHandler(function (error, request, reply) {
  fastify.log.error('Error details:', {
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    validation: error.validation,
    url: request.url,
    method: request.method
  });

  // Handle validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: "Validation Error",
      details: error.validation
    });
  }

  // Handle Sequelize errors
  if (error.name && error.name.includes('Sequelize')) {
    return reply.status(400).send({
      error: "Database Error",
      message: error.message
    });
  }

  reply.status(error.statusCode || 500).send({
    error: error.message || "Internal Server Error"
  });
});

// ✅ ADD: 404 handler for better debugging
fastify.setNotFoundHandler((request, reply) => {
  console.log(`❌ 404 Not Found: ${request.method} ${request.url}`);
  reply.code(404).send({
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    availableRoutes: 'Check /health for server status'
  });
});

// Start server
const start = async () => {
  try {
    await db.sequelize.authenticate();
    console.log("✅ Database connected successfully.");

    await db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database synchronized.');

    const port = process.env.PORT || 8000;
    await fastify.listen({ port, host: "0.0.0.0" });
    
    console.log(`🚀 Server running on port ${port}`);
    
    // ✅ DEBUG: Print all registered routes
    console.log('📋 Registered routes:');
    console.log(fastify.printRoutes());
    
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    await db.sequelize.close();
    console.log("Database connection closed.");
    await fastify.close();
    console.log("Server closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

start();