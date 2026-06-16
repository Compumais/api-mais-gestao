import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarMovimentoEstoque } from "./atualizar.js";
import { buscarMovimentoEstoque } from "./buscar.js";
import { criarMovimentoEstoque } from "./criar.js";
import * as schema from "./doc-schema/schemas.js";
import { excluirMovimentoEstoque } from "./excluir.js";
import { listarMovimentosEstoque } from "./listar-movimentos-estoque.js";

export async function movimentosEstoqueRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/movimentos-estoque", {
		schema: schema.criarMovimentoEstoqueSchema,
		handler: criarMovimentoEstoque,
	});
	app.get("/movimentos-estoque", {
		schema: schema.listarMovimentosEstoqueSchema,
		handler: listarMovimentosEstoque,
	});
	app.get("/movimentos-estoque/:id", {
		schema: schema.buscarMovimentoEstoqueSchema,
		handler: buscarMovimentoEstoque,
	});
	app.put("/movimentos-estoque/:id", {
		schema: schema.atualizarMovimentoEstoqueSchema,
		handler: atualizarMovimentoEstoque,
	});
	app.delete("/movimentos-estoque/:id", {
		schema: schema.excluirMovimentoEstoqueSchema,
		handler: excluirMovimentoEstoque,
	});
}

