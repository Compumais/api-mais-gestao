import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { atualizarProduto } from "./atualizar.js";
import { buscarProduto } from "./buscar.js";
import { criarProduto } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirProduto } from "./excluir.js";
import { inativarProduto } from "./inativar.js";
import { listarProdutos } from "./listar.js";
import { tributacaoPorCfop } from "./tributacao-por-cfop.js";

export async function produtosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/produtos", {
		schema: schema.criarProdutoSchema,
		handler: criarProduto,
	});
	app.get("/produtos", {
		schema: schema.listarProdutosSchema,
		handler: listarProdutos,
	});
	app.get("/produtos/tributacao-por-cfop", {
		schema: schema.tributacaoPorCfopSchema,
		handler: tributacaoPorCfop,
	});
	app.get("/produtos/proximo-codigo", {
		schema: criarProximoCodigoSchema("produtos", "number"),
		handler: criarHandlerProximoCodigo("produto"),
	});
	app.patch("/produtos/inativar/:id", {
		schema: schema.inativarProdutoSchema,
		handler: inativarProduto,
	});
	app.get("/produtos/:id", {
		schema: schema.buscarProdutoSchema,
		handler: buscarProduto,
	});
	app.put("/produtos/:id", {
		schema: schema.atualizarProdutoSchema,
		handler: atualizarProduto,
	});
	app.delete("/produtos/:id", {
		schema: schema.excluirProdutoSchema,
		handler: excluirProduto,
	});
}
