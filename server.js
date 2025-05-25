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

// ✅ IMPORTANT: Fastify has built-in JSON parser, but ensure it's working
// Add this to debug body parsing
fastify.addHook('preHandler', async (request, reply) => {
  if (request.method === 'POST' || request.method === 'PUT') {
    fastify.log.info('Request Body:', request.body);
    fastify.log.info('Request Headers:', request.headers);
  }
});

// Register routes with prefix /api
fastify.register(require('./routes/terms'), { prefix: '/api' });
fastify.register(require('./routes/products'), { prefix: '/api' });

// ✅ IMPROVED: Better error handler
fastify.setErrorHandler(function (error, request, reply) {
  fastify.log.error('Error details:', {
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    validation: error.validation
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

// Start server
const start = async () => {
  try {
    await db.sequelize.authenticate();
    console.log("Database connected successfully.");

    await db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synchronized.');

    const port = process.env.PORT || 8000;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server running on port ${port}`);
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