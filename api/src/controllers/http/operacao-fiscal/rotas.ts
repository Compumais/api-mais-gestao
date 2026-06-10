import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarOperacaoFiscal } from "./atualizar.js";
import { buscarOperacaoFiscal } from "./buscar.js";
import { criarOperacaoFiscal } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirOperacaoFiscal } from "./excluir.js";
import { listarOperacaoFiscals } from "./listar.js";

export async function operacoesFiscaisRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/operacoes-fiscais", {
		schema: schema.criarOperacaoFiscalSchema,
		handler: criarOperacaoFiscal,
	});
	app.get("/operacoes-fiscais", {
		schema: schema.listarOperacaoFiscalsSchema,
		handler: listarOperacaoFiscals,
	});
	app.get("/operacoes-fiscais/:id", {
		schema: schema.buscarOperacaoFiscalSchema,
		handler: buscarOperacaoFiscal,
	});
	app.put("/operacoes-fiscais/:id", {
		schema: schema.atualizarOperacaoFiscalSchema,
		handler: atualizarOperacaoFiscal,
	});
	app.delete("/operacoes-fiscais/:id", {
		schema: schema.excluirOperacaoFiscalSchema,
		handler: excluirOperacaoFiscal,
	});
}
