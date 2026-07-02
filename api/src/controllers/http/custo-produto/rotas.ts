import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarCustoProduto } from "./buscar.js";
import { criarCustoProduto } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirCustoProduto } from "./excluir.js";
import { listarHistoricoComposicao } from "./historico.js";
import { listarCustosProduto } from "./listar.js";
import { registrarCustosNf } from "./registrar-nf.js";

export async function custosProdutoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/custos-produto/nf", {
		schema: schema.registrarCustosNfSchema,
		handler: registrarCustosNf,
	});
	app.post("/custos-produto", {
		schema: schema.criarCustoProdutoSchema,
		handler: criarCustoProduto,
	});
	app.get("/custos-produto", {
		schema: schema.listarCustosProdutoSchema,
		handler: listarCustosProduto,
	});
	app.get("/custos-produto/historico", {
		schema: schema.listarHistoricoComposicaoSchema,
		handler: listarHistoricoComposicao,
	});
	app.get("/custos-produto/:id", {
		schema: schema.buscarCustoProdutoSchema,
		handler: buscarCustoProduto,
	});
	app.delete("/custos-produto/:id", {
		schema: schema.excluirCustoProdutoSchema,
		handler: excluirCustoProduto,
	});
}
