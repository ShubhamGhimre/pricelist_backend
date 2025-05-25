const fastify = require('fastify')({
  logger: {
    level: 'info'
  }
});

require("dotenv").config();
const db = require("./models");

// ✅ PRODUCTION FIX: More permissive CORS for debugging
fastify.register(require("@fastify/cors"), {
  origin: true, // Allow all origins for debugging - restrict in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
});

// ✅ PRODUCTION FIX: Enhanced body parsers with larger limits
fastify.register(require('@fastify/formbody'), {
  bodyLimit: 1048576 // 1MB
});
fastify.register(require('@fastify/multipart'), {
  limits: {
    fieldNameSize: 100,
    fieldSize: 1000000,
    fields: 10,
    fileSize: 1000000,
    files: 1,
    headerPairs: 2000
  }
});

// ✅ PRODUCTION DEBUG: Enhanced request logging
fastify.addHook('onRoute', (routeOptions) => {
  console.log(`✅ Route registered: ${routeOptions.method} ${routeOptions.path}`);
});

fastify.addHook('onRequest', async (request, reply) => {
  console.log(`📝 INCOMING REQUEST:`, {
    method: request.method,
    url: request.url,
    headers: {
      'content-type': request.headers['content-type'],
      'user-agent': request.headers['user-agent'],
      'origin': request.headers['origin'],
      'referer': request.headers['referer']
    },
    ip: request.ip,
    hostname: request.hostname
  });
});

// ✅ PRODUCTION DEBUG: Enhanced body parsing logging
fastify.addHook('preHandler', async (request, reply) => {
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
    console.log(`🔍 BODY PARSING - Method: ${request.method}`, {
      contentType: request.headers['content-type'],
      contentLength: request.headers['content-length'],
      body: request.body,
      rawBody: request.body ? 'Present' : 'Missing'
    });
    
    fastify.log.info('Request Body:', request.body);
    fastify.log.info('Content-Type:', request.headers['content-type']);
  }
});

// ✅ PRODUCTION FIX: OPTIONS preflight handler
fastify.options('*', async (request, reply) => {
  console.log(`🔧 OPTIONS REQUEST for: ${request.url}`);
  return reply
    .code(200)
    .header('Access-Control-Allow-Origin', '*')
    .header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    .header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin')
    .send();
});

// ✅ PRODUCTION DEBUG: Enhanced test route
fastify.post("/test-post", async (request, reply) => {
  console.log("🚀 TEST POST RECEIVED - DETAILED LOG:", {
    method: request.method,
    url: request.url,
    body: request.body,
    headers: request.headers,
    contentType: request.headers['content-type'],
    timestamp: new Date().toISOString(),
    ip: request.ip
  });
  
  return reply
    .code(200)
    .header('Content-Type', 'application/json')
    .send({
      success: true,
      message: "POST is working in production!",
      receivedData: {
        body: request.body,
        method: request.method,
        contentType: request.headers['content-type'],
        timestamp: new Date().toISOString()
      }
    });
});

// ✅ PRODUCTION DEBUG: Add a simple GET test route for comparison
fastify.get("/test-get", async (request, reply) => {
  console.log("🚀 TEST GET RECEIVED:", {
    method: request.method,
    url: request.url,
    query: request.query
  });
  
  return reply.send({
    success: true,
    message: "GET is working!",
    method: request.method,
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
      environment: process.env.NODE_ENV || 'production',
      port: process.env.PORT || 8000
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

// ✅ PRODUCTION FIX: Better route registration with error handling
async function registerRoutes(fastify) {
  try {
    console.log("🔧 Starting route registration...");
    
    await fastify.register(require('./routes/terms'), { prefix: '/api' });
    console.log("✅ Terms routes registered");
    
    await fastify.register(require('./routes/products'), { prefix: '/api' });
    console.log("✅ Products routes registered");
    
    console.log('✅ All API routes registered successfully');
  } catch (error) {
    console.error('❌ Error registering routes:', error);
    throw error;
  }
}

// Register the routes
fastify.register(registerRoutes);

// ✅ PRODUCTION FIX: Enhanced error handler
fastify.setErrorHandler(function (error, request, reply) {
  console.error('🚨 ERROR OCCURRED:', {
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    validation: error.validation,
    url: request.url,
    method: request.method,
    headers: request.headers,
    body: request.body
  });

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
      details: error.validation,
      url: request.url,
      method: request.method
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
    error: error.message || "Internal Server Error",
    url: request.url,
    method: request.method
  });
});

// ✅ PRODUCTION DEBUG: Enhanced 404 handler
fastify.setNotFoundHandler((request, reply) => {
  console.log(`❌ 404 NOT FOUND - DETAILED:`, {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body,
    query: request.query
  });
  
  reply.code(404).send({
    error: 'Route Not Found',
    details: {
      method: request.method,
      url: request.url,
      message: `Route ${request.method} ${request.url} not found`
    },
    availableRoutes: {
      test: 'POST /test-post, GET /test-get',
      health: 'GET /health',
      api: 'Check logs for registered API routes'
    }
  });
});

// Start server
const start = async () => {
  try {
    console.log("🚀 Starting server...");
    console.log("🌍 Environment:", process.env.NODE_ENV || 'production');
    
    await db.sequelize.authenticate();
    console.log("✅ Database connected successfully.");

    await db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database synchronized.');

    const port = process.env.PORT || 8000;
    const host = "0.0.0.0";
    
    await fastify.listen({ port, host });
    
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🌐 Server accessible at: http://${host}:${port}`);
    
    // ✅ PRODUCTION DEBUG: Print all registered routes
    console.log('📋 All registered routes:');
    console.log(fastify.printRoutes());
    
    // ✅ PRODUCTION DEBUG: Test endpoints info
    console.log('\n🧪 Test endpoints:');
    console.log(`   POST http://your-domain:${port}/test-post`);
    console.log(`   GET  http://your-domain:${port}/test-get`);
    console.log(`   GET  http://your-domain:${port}/health`);
    
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    fastify.log.error(error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  try {
    console.log("🛑 Shutting down gracefully...");
    await db.sequelize.close();
    console.log("✅ Database connection closed.");
    await fastify.close();
    console.log("✅ Server closed.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

start();