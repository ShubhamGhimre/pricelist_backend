const { Products } = require("../models");

async function productRoutes(fastify, options) {
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
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  // Create new product
  fastify.post("/product", async (request, reply) => {
    try {
      console.log("POST /product hit");
      console.log("Request body:", request.body);

      const product = await Products.create(request.body);
      return reply.code(201).send({ success: true, data: product });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  // Get product by id
  fastify.get("/product/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const product = await Products.findByPk(id);
      if (!product) {
        return reply.code(404).send({ error: "Product not found" });
      }
      return { success: true, data: product };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
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
        return reply.code(404).send({ error: "Product not found" });
      }

      const updatedProduct = await Products.findByPk(id);
      return { success: true, data: updatedProduct };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
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
        return reply.code(404).send({ error: "Product not found" });
      }

      return { success: true, message: "Product deleted successfully" };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });
}

module.exports = productRoutes;
