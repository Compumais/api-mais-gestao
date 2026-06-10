import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarPlanoContasContaContabil } from "./atualizar.js";
import { buscarPlanoContasContaContabil } from "./buscar.js";
import { criarPlanoContasContaContabil } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirPlanoContasContaContabil } from "./excluir.js";
import { listarPlanoContasContaContabils } from "./listar.js";

export async function planosContasContaContabilRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/planos-contas-conta-contabil", {
		schema: schema.criarPlanoContasContaContabilSchema,
		handler: criarPlanoContasContaContabil,
	});
	app.get("/planos-contas-conta-contabil", {
		schema: schema.listarPlanoContasContaContabilsSchema,
		handler: listarPlanoContasContaContabils,
	});
	app.get("/planos-contas-conta-contabil/:id", {
		schema: schema.buscarPlanoContasContaContabilSchema,
		handler: buscarPlanoContasContaContabil,
	});
	app.put("/planos-contas-conta-contabil/:id", {
		schema: schema.atualizarPlanoContasContaContabilSchema,
		handler: atualizarPlanoContasContaContabil,
	});
	app.delete("/planos-contas-conta-contabil/:id", {
		schema: schema.excluirPlanoContasContaContabilSchema,
		handler: excluirPlanoContasContaContabil,
	});
}
