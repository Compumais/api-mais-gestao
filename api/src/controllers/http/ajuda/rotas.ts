import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	buscarAjudaPostPublicoPorSlugService,
	listarAjudaPostsPublicosService,
} from "@/service/ajuda/listar-ajuda-posts.js";

export async function ajudaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/ajuda-posts", async (_request, reply) => {
		const resultado = await listarAjudaPostsPublicosService();
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	});

	app.get("/ajuda-posts/:slug", async (request, reply) => {
		const params = z.object({ slug: z.string().min(1) }).parse(request.params);
		const resultado = await buscarAjudaPostPublicoPorSlugService(params.slug);
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	});
}
