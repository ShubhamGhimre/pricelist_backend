const { Products } = require("../models");

async function productRoutes(fastify, options) {
  // ✅ IMPROVED: Better validation and error handling for POST
  fastify.post("/product", {
    schema: {
      body: {
        type: 'object',
        required: ['artical_no', 'product_service', 'price', 'unit'],
        properties: {
          artical_no: { type: 'string' },
          product_service: { type: 'string' },
          in_price: { type: 'number' },
          price: { type: 'number' },
          unit: { type: 'string' },
          in_stock: { type: 'integer' },
          description: { type: 'string' },
          is_active: { type: 'boolean' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log("POST /product hit");
      console.log("Request body:", JSON.stringify(request.body, null, 2));
      console.log("Content-Type:", request.headers['content-type']);

      // Validate required fields
      const { artical_no, product_service, price, unit } = request.body;
      
      if (!artical_no || !product_service || !price || !unit) {
        return reply.code(400).send({
          success: false,
          error: "Missing required fields: artical_no, product_service, price, unit"
        });
      }

      const product = await Products.create(request.body);
      return reply.code(201).send({ success: true, data: product });
    } catch (error) {
      console.error("Product creation error:", error);
      
      // Handle unique constraint violations
      if (error.name === 'SequelizeUniqueConstraintError') {
        return reply.code(409).send({
          success: false,
          error: "Product with this article number already exists"
        });
      }
      
      fastify.log.error(error);
      return reply.code(500).send({
        success: false,
        error: "Failed to create product",
        details: error.message
      });
    }
  });

  // Get all products
  fastify.get("/product", async (request, reply) => {
    try {
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
      fastify.log.error(error);
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
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false, 
        error: "Internal Server Error" 
      });
    }
  });

  // Update product by id
  fastify.put("/product/:id", async (request, reply) => {
    try {
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
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false, 
        error: "Internal Server Error" 
      });
    }
  });

  // Delete product by id
  fastify.delete("/product/:id", async (request, reply) => {
    try {
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
      fastify.log.error(error);
      return reply.code(500).send({ 
        success: false, 
        error: "Internal Server Error" 
      });
    }
  });
}

module.exports = productRoutes;