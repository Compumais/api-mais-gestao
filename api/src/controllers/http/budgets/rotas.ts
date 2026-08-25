import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { acompanhamentoBudget } from "./acompanhamento.js";
import { atualizarBudget } from "./atualizar.js";
import { buscarBudget } from "./buscar.js";
import { criarBudget } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirBudget } from "./excluir.js";
import { listarBudgets } from "./listar.js";

export async function budgetsRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/budgets", {
		schema: schema.criarBudgetSchema,
		handler: criarBudget,
	});
	app.get("/budgets", {
		schema: schema.listarBudgetsSchema,
		handler: listarBudgets,
	});
	app.get("/budgets/acompanhamento", {
		schema: schema.acompanhamentoBudgetSchema,
		handler: acompanhamentoBudget,
	});
	app.get("/budgets/:id", {
		schema: schema.buscarBudgetSchema,
		handler: buscarBudget,
	});
	app.put("/budgets/:id", {
		schema: schema.atualizarBudgetSchema,
		handler: atualizarBudget,
	});
	app.delete("/budgets/:id", {
		schema: schema.excluirBudgetSchema,
		handler: excluirBudget,
	});
}
