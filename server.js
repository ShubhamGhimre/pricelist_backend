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

fastify.register(require('@fastify/multipart'));
// OR if you're only sending JSON:
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
  try {
    const json = JSON.parse(body)
    done(null, json)
  } catch (err) {
    err.statusCode = 400
    done(err, undefined)
  }
})

// Explicitly register body parser plugin (optional but safe)
fastify.register(require('@fastify/formbody'));

// Register routes with prefix /api
fastify.register(require('./routes/terms'), { prefix: '/api' });
fastify.register(require('./routes/products'), { prefix: '/api' });

fastify.setErrorHandler(function (error, request, reply) {
  fastify.log.error(error);
  reply.status(500).send({ error: "Internal Server Error" });
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
