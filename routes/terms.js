const { Terms } = require("../models");

async function termRoutes(fastify, options) {
  // Get ALL Terms
  fastify.get("/terms/:language", async (request, reply) => {
    try {
      const { language } = request.params;

      if (!["en", "sv"].includes(language)) {
        return reply.code(400).send({ error: "Invalid language parameter" });
      }

      const terms = await Terms.findAll({
        where: { language, is_active: true },
        order: [["createdAt", "DESC"]],
      });

      return { success: true, data: terms };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  // get Terms by section_key and language

  fastify.get("/terms/:language/:section_key", async (request, reply) => {
    try {
      const { language, section_key } = request.params;

      if (!["en", "sv"].includes(language)) {
        return reply.code(400).send({ error: "Invalid language parameter" });
      }

      const terms = await Terms.findAll({
        where: {
          language,
          section_key,
          is_active: true,
        },
        order: [["createdAt", "DESC"]],
      });

      return { success: true, data: terms };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  // Create a new Term

  fastify.post("/terms", async (request, reply) => {
    try {
      const term = await Terms.create(request.body);
      return reply.code(201).send({ success: true, data: term });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  // Update a Term by ID
  fastify.put("/terms/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const [updated] = await Terms.update(request.body, {
        where: { id },
      });

      if (!updated) {
        return reply.code(404).send({ error: "Term not found" });
      }

      const updatedTerm = await Terms.findByPk(id);
      return { success: true, data: updatedTerm };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  // Delete a Term by ID
  fastify.delete("/terms/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const deleted = await Terms.destroy({
        where: { id },
      });

      if (!deleted) {
        return reply.code(404).send({ error: "Term not found" });
      }

      return { success: true, message: "Term deleted successfully" };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });
}

module.exports = termRoutes;
