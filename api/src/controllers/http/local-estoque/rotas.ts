import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarLocalEstoque } from "./atualizar.js";
import { buscarLocalEstoque } from "./buscar.js";
import { criarLocalEstoque } from "./criar.js";
import * as schema from "./doc-schema/schemas.js";
import { excluirLocalEstoque } from "./excluir.js";
import { listarLocaisEstoque } from "./listar-locais-estoque.js";

export async function locaisEstoqueRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/locais-estoque", {
		schema: schema.criarLocalEstoqueSchema,
		handler: criarLocalEstoque,
	});
	app.get("/locais-estoque", {
		schema: schema.listarLocaisEstoqueSchema,
		handler: listarLocaisEstoque,
	});
	app.get("/locais-estoque/:id", {
		schema: schema.buscarLocalEstoqueSchema,
		handler: buscarLocalEstoque,
	});
	app.put("/locais-estoque/:id", {
		schema: schema.atualizarLocalEstoqueSchema,
		handler: atualizarLocalEstoque,
	});
	app.delete("/locais-estoque/:id", {
		schema: schema.excluirLocalEstoqueSchema,
		handler: excluirLocalEstoque,
	});
}
