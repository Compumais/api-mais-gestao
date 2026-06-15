import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarContaMesa } from "./atualizar.js";
import { buscarContaMesa } from "./buscar.js";
import { criarContaMesa } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirContaMesa } from "./excluir.js";
import { listarContasMesa } from "./listar.js";

export async function contasMesaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/contas-mesa", {
		schema: schema.criarContaMesaSchema,
		handler: criarContaMesa,
	});
	app.get("/contas-mesa", {
		schema: schema.listarContasMesaSchema,
		handler: listarContasMesa,
	});
	app.get("/contas-mesa/:id", {
		schema: schema.buscarContaMesaSchema,
		handler: buscarContaMesa,
	});
	app.put("/contas-mesa/:id", {
		schema: schema.atualizarContaMesaSchema,
		handler: atualizarContaMesa,
	});
	app.delete("/contas-mesa/:id", {
		schema: schema.excluirContaMesaSchema,
		handler: excluirContaMesa,
	});
}
