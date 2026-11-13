import type { FastifyInstance } from "fastify";
import { resolveEmpresaContext } from "../../middleware/resolve-empresa-context.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarFinanceiro } from "./atualizar.js";
import { buscarFinanceiro } from "./buscar.js";
import { criarFinanceiro } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirFinanceiro } from "./excluir.js";
import { listarFinanceiros } from "./listar-financeiros.js";

export async function financeiroRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/financeiro", {
		schema: schema.criarFinanceiroSchema,
		preHandler: [resolveEmpresaContext],
		handler: criarFinanceiro,
	});
	app.get("/financeiro", {
		schema: schema.listarFinanceirosSchema,
		preHandler: [resolveEmpresaContext],
		handler: listarFinanceiros,
	});
	app.get("/financeiro/:id", {
		schema: schema.buscarFinanceiroSchema,
		handler: buscarFinanceiro,
	});
	app.put("/financeiro/:id", {
		schema: schema.atualizarFinanceiroSchema,
		handler: atualizarFinanceiro,
	});
	app.delete("/financeiro/:id", {
		schema: schema.excluirFinanceiroSchema,
		handler: excluirFinanceiro,
	});
}
