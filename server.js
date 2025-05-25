const fastify = require('fastify')({
  logger: {
    level: 'info'
  }
});

require("dotenv").config();

const database = require("./config/database"); // Import the Database configuration
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

// Register the routes
fastify.register( require('./routes/terms'), {prefix: '/api'} );
fastify.register( require('./routes/products'), {prefix: '/api'} );

// Health check route
fastify.get("/health", async (request, reply) => {
  try {
    // Check database connection
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

// Start the server
const start = async () => {
  try {
    await db.sequelize.authenticate();

    console.log("Database connection has been established successfully. \n");

    // Sync the database models
    await db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synchronized successfully.');

    const port = process.env.PORT || 8000;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server running on port ${port}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  try {
    await db.sequelize.close();
    console.log("Database connection closed gracefully.");

    await fastify.close();
    console.log("Server closed gracefully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

start();