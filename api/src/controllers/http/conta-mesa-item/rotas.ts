import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarContaMesaItem } from "./atualizar.js";
import { buscarContaMesaItem } from "./buscar.js";
import { criarContaMesaItem } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirContaMesaItem } from "./excluir.js";
import { listarContasMesaItem } from "./listar.js";

export async function contasMesaItemRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/contas-mesa-item", {
		schema: schema.criarContaMesaItemSchema,
		handler: criarContaMesaItem,
	});
	app.get("/contas-mesa-item", {
		schema: schema.listarContasMesaItemSchema,
		handler: listarContasMesaItem,
	});
	app.get("/contas-mesa-item/:id", {
		schema: schema.buscarContaMesaItemSchema,
		handler: buscarContaMesaItem,
	});
	app.put("/contas-mesa-item/:id", {
		schema: schema.atualizarContaMesaItemSchema,
		handler: atualizarContaMesaItem,
	});
	app.delete("/contas-mesa-item/:id", {
		schema: schema.excluirContaMesaItemSchema,
		handler: excluirContaMesaItem,
	});
}
