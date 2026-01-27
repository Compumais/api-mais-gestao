import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarPlanoContas } from "./atualizar.js";
import { buscarPlanoContas } from "./buscar.js";
import { criarPlanoContas } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirPlanoContas } from "./excluir.js";
import { listarPlanoContas } from "./listar.js";

export function planoContasRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/plano-contas", {
		schema: schema.criarPlanoContasSchema,
		handler: criarPlanoContas,
	});

	app.get("/plano-contas", {
		schema: schema.listarPlanoContasSchema,
		handler: listarPlanoContas,
	});

	app.get("/plano-contas/:id", {
		schema: schema.buscarPlanoContasSchema,
		handler: buscarPlanoContas,
	});

	app.put("/plano-contas/:id", {
		schema: schema.atualizarPlanoContasSchema,
		handler: atualizarPlanoContas,
	});

	app.delete("/plano-contas/:id", {
		schema: schema.excluirPlanoContasSchema,
		handler: excluirPlanoContas,
	});
}
