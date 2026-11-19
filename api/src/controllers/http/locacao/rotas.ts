import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { atualizarLocacao } from "./atualizar.js";
import { buscarLocacao } from "./buscar.js";
import { cancelarLocacao } from "./cancelar.js";
import { criarLocacao } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { fecharLocacao } from "./fechar.js";
import { listarLocacoes } from "./listar.js";
import { listarMapaLocacoes } from "./listar-mapa.js";
import { preverFechamentoLocacao } from "./prever.js";

export async function locacoesRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/locacoes/proximo-codigo", {
		schema: criarProximoCodigoSchema("locacoes", "string"),
		handler: criarHandlerProximoCodigo("locacao"),
	});
	app.post("/locacoes", {
		schema: schema.criarLocacaoSchema,
		handler: criarLocacao,
	});
	app.get("/locacoes", {
		schema: schema.listarLocacoesSchema,
		handler: listarLocacoes,
	});
	app.get("/locacoes/mapa", {
		schema: schema.listarMapaLocacoesSchema,
		handler: listarMapaLocacoes,
	});
	app.get("/locacoes/:id", {
		schema: schema.buscarLocacaoSchema,
		handler: buscarLocacao,
	});
	app.put("/locacoes/:id", {
		schema: schema.atualizarLocacaoSchema,
		handler: atualizarLocacao,
	});
	app.post("/locacoes/:id/prever-fechamento", {
		schema: schema.preverFechamentoLocacaoSchema,
		handler: preverFechamentoLocacao,
	});
	app.post("/locacoes/:id/fechar", {
		schema: schema.fecharLocacaoSchema,
		handler: fecharLocacao,
	});
	app.post("/locacoes/:id/cancelar", {
		schema: schema.cancelarLocacaoSchema,
		handler: cancelarLocacao,
	});
}
