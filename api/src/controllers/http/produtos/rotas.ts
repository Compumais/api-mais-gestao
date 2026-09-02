import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { alterarProdutosEmMassa } from "./alterar-em-massa.js";
import { atualizarProduto } from "./atualizar.js";
import { buscarProduto } from "./buscar.js";
import { listarCatalogoPdv } from "./catalogo-pdv.js";
import { criarProduto } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirProduto } from "./excluir.js";
import { exportarProdutosMgv } from "./exportar-mgv.js";
import { importarProdutos } from "./importar.js";
import { previewImportacaoProdutos } from "./importar-preview.js";
import { inativarProduto } from "./inativar.js";
import { listarProdutos } from "./listar.js";
import { listarLotesProduto } from "./lotes.js";
import { templateProdutos } from "./template.js";
import { tributacaoPorCfop } from "./tributacao-por-cfop.js";

const LIMITE_BODY_IMPORTACAO = 20 * 1024 * 1024;

// Restringe :id a UUID no path para que segmentos estáticos ausentes
// (ex.: "catalogo-pdv") retornem 404 em vez de FST_ERR_VALIDATION.
const ID_UUID_PARAM =
	":id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})";

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
	app.get("/produtos/catalogo-pdv", {
		schema: schema.listarCatalogoPdvSchema,
		handler: listarCatalogoPdv,
	});
	app.get("/produtos/tributacao-por-cfop", {
		schema: schema.tributacaoPorCfopSchema,
		handler: tributacaoPorCfop,
	});
	app.post("/produtos/exportar-mgv", {
		schema: schema.exportarProdutosMgvSchema,
		handler: exportarProdutosMgv,
	});
	app.get("/produtos/proximo-codigo", {
		schema: criarProximoCodigoSchema("produtos", "number"),
		handler: criarHandlerProximoCodigo("produto"),
	});
	app.get("/produtos/template", {
		schema: schema.templateProdutosSchema,
		handler: templateProdutos,
	});
	app.post("/produtos/importar/preview", {
		schema: schema.previewImportacaoProdutosSchema,
		bodyLimit: LIMITE_BODY_IMPORTACAO,
		handler: previewImportacaoProdutos,
	});
	app.post("/produtos/importar", {
		schema: schema.importarProdutosSchema,
		bodyLimit: LIMITE_BODY_IMPORTACAO,
		handler: importarProdutos,
	});
	app.patch(`/produtos/inativar/${ID_UUID_PARAM}`, {
		schema: schema.inativarProdutoSchema,
		handler: inativarProduto,
	});
	app.post("/produtos/alterar-em-massa", {
		schema: schema.alterarProdutosEmMassaSchema,
		handler: alterarProdutosEmMassa,
	});
	app.get(`/produtos/${ID_UUID_PARAM}/lotes`, {
		handler: listarLotesProduto,
	});
	app.get(`/produtos/${ID_UUID_PARAM}`, {
		schema: schema.buscarProdutoSchema,
		handler: buscarProduto,
	});
	app.put(`/produtos/${ID_UUID_PARAM}`, {
		schema: schema.atualizarProdutoSchema,
		handler: atualizarProduto,
	});
	app.delete(`/produtos/${ID_UUID_PARAM}`, {
		schema: schema.excluirProdutoSchema,
		handler: excluirProduto,
	});
}
