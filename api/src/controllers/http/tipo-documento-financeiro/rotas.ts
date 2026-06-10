import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarTipoDocumentoFinanceiro } from "./atualizar.js";
import { buscarTipoDocumentoFinanceiro } from "./buscar.js";
import { criarTipoDocumentoFinanceiro } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirTipoDocumentoFinanceiro } from "./excluir.js";
import { listarTipoDocumentoFinanceiros } from "./listar.js";

export async function tiposDocumentoFinanceiroRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/tipos-documento-financeiro", {
		schema: schema.criarTipoDocumentoFinanceiroSchema,
		handler: criarTipoDocumentoFinanceiro,
	});
	app.get("/tipos-documento-financeiro", {
		schema: schema.listarTipoDocumentoFinanceirosSchema,
		handler: listarTipoDocumentoFinanceiros,
	});
	app.get("/tipos-documento-financeiro/:id", {
		schema: schema.buscarTipoDocumentoFinanceiroSchema,
		handler: buscarTipoDocumentoFinanceiro,
	});
	app.put("/tipos-documento-financeiro/:id", {
		schema: schema.atualizarTipoDocumentoFinanceiroSchema,
		handler: atualizarTipoDocumentoFinanceiro,
	});
	app.delete("/tipos-documento-financeiro/:id", {
		schema: schema.excluirTipoDocumentoFinanceiroSchema,
		handler: excluirTipoDocumentoFinanceiro,
	});
}
