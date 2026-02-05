import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarFinanceiroLancamento } from "./atualizar.js";
import { buscarFinanceiroLancamento } from "./buscar.js";
import { criarFinanceiroLancamento } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirFinanceiroLancamento } from "./excluir.js";
import { listarFinanceiroLancamento } from "./listar.js";

export async function financeiroLancamentoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/financeiro-lancamentos", {
		schema: schema.criarFinanceiroLancamentoSchema,
		handler: criarFinanceiroLancamento,
	});
	app.get("/financeiro-lancamentos", {
		schema: schema.listarFinanceiroLancamentoSchema,
		handler: listarFinanceiroLancamento,
	});
	app.get("/financeiro-lancamentos/:id", {
		schema: schema.buscarFinanceiroLancamentoSchema,
		handler: buscarFinanceiroLancamento,
	});
	app.put("/financeiro-lancamentos/:id", {
		schema: schema.atualizarFinanceiroLancamentoSchema,
		handler: atualizarFinanceiroLancamento,
	});
	app.delete("/financeiro-lancamentos/:id", {
		schema: schema.excluirFinanceiroLancamentoSchema,
		handler: excluirFinanceiroLancamento,
	});
}
