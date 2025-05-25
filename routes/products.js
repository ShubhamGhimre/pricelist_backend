const { Products } = require("../models");

// ✅ FIXED: Alternative export pattern that works better in production
module.exports = async function productRoutes(fastify, options) {
  
  // Log when routes are being registered
  console.log("Registering product routes...");
  
  // ✅ IMPROVED: Simplified POST without schema validation first
  fastify.post("/product", async (request, reply) => {
    try {
      console.log("=== POST /api/product RECEIVED ===");
      console.log("Method:", request.method);
      console.log("URL:", request.url);
      console.log("Headers:", JSON.stringify(request.headers, null, 2));
      console.log("Body:", JSON.stringify(request.body, null, 2));
      console.log("Raw body type:", typeof request.body);

      // Check if body exists
      if (!request.body || Object.keys(request.body).length === 0) {
        console.log("ERROR: Empty body received");
        return reply.code(400).send({
          success: false,
          error: "Request body is empty or not parsed correctly",
          receivedBody: request.body
        });
      }

      // Validate required fields
      const { artical_no, product_service, price, unit } = request.body;
      
      if (!artical_no || !product_service || price === undefined || !unit) {
        console.log("ERROR: Missing required fields");
        return reply.code(400).send({
          success: false,
          error: "Missing required fields",
          required: ["artical_no", "product_service", "price", "unit"],
          received: Object.keys(request.body)
        });
      }

      console.log("Creating product with data:", request.body);
      const product = await Products.create(request.body);
      console.log("Product created successfully:", product.toJSON());
      
      return reply.code(201).send({ 
        success: true, 
        data: product,
        message: "Product created successfully"
      });
      
    } catch (error) {
      console.error("=== POST ERROR ===");
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      // Handle unique constraint violations
      if (error.name === 'SequelizeUniqueConstraintError') {
        return reply.code(409).send({
          success: false,
          error: "Product with this article number already exists"
        });
      }
      
      return reply.code(500).send({
        success: false,
        error: "Failed to create product",
        details: error.message,
        errorType: error.name
      });
    }
  });

  // Get all products
  fastify.get("/product", async (request, reply) => {
    try {
      console.log("=== GET /api/product RECEIVED ===");
      const { page = 0, limit = 50, artical_no } = request.query;
      const offset = page * limit;

      const whereClause = { is_active: true };
      if (artical_no) {
        whereClause.artical_no = artical_no;
      }

      const products = await Products.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["createdAt", "DESC"]],
      });

      return { success: true, data: products };
    } catch (error) {
      console.error("GET products error:", error);
      return reply.code(500).send({ 
        success: false, 
        error: "Internal Server Error" 
      });
    }
  });

  // Get product by id
  fastify.get("/product/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const product = await Products.findByPk(id);
      if (!product) {
        return reply.code(404).send({ 
          success: false, 
          error: "Product not found" 
        });
      }
      return { success: true, data: product };
    } catch (error) {
      console.error("GET product by ID error:", error);
      return reply.code(500).send({ 
        success: false, 
        error: "Internal Server Error" 
      });
    }
  });

  // Update product by id
  fastify.put("/product/:id", async (request, reply) => {
    try {
      console.log("=== PUT /api/product/:id RECEIVED ===");
      console.log("ID:", request.params.id);
      console.log("Body:", JSON.stringify(request.body, null, 2));
      
      const { id } = request.params;
      const [updated] = await Products.update(request.body, {
        where: { id },
      });

      if (!updated) {
        return reply.code(404).send({ 
          success: false, 
          error: "Product not found" 
        });
      }

      const updatedProduct = await Products.findByPk(id);
      return { success: true, data: updatedProduct };
    } catch (error) {
      console.error("PUT product error:", error);
      return reply.code(500).send({ 
        success: false, 
        error: "Internal Server Error",
        details: error.message
      });
    }
  });

  // Delete product by id
  fastify.delete("/product/:id", async (request, reply) => {
    try {
      console.log("=== DELETE /api/product/:id RECEIVED ===");
      const { id } = request.params;
      const deleted = await Products.destroy({
        where: { id },
      });

      if (!deleted) {
        return reply.code(404).send({ 
          success: false, 
          error: "Product not found" 
        });
      }

      return { success: true, message: "Product deleted successfully" };
    } catch (error) {
      console.error("DELETE product error:", error);
      return reply.code(500).send({ 
        success: false, 
        error: "Internal Server Error" 
      });
    }
  });

  console.log("Product routes registered successfully");
};