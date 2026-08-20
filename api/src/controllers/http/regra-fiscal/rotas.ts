import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarRegraFiscal } from "./atualizar.js";
import { buscarRegraFiscal } from "./buscar.js";
import { criarRegraFiscal } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { listarHistoricoRegraFiscal } from "./historico.js";
import { listarRegrasFiscais } from "./listar.js";
import { rollbackRegraFiscal } from "./rollback.js";
import { validarRegraFiscal } from "./validar.js";

export async function regraFiscalRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/regras-fiscais", {
		schema: schema.listarRegrasFiscaisSchema,
		handler: listarRegrasFiscais,
	});

	app.get("/regras-fiscais/:id", {
		schema: schema.buscarRegraFiscalSchema,
		handler: buscarRegraFiscal,
	});

	app.get("/regras-fiscais/:id/historico", {
		schema: schema.historicoRegraFiscalSchema,
		handler: listarHistoricoRegraFiscal,
	});

	app.post("/regras-fiscais", {
		schema: schema.criarRegraFiscalSchema,
		handler: criarRegraFiscal,
	});

	app.put("/regras-fiscais/:id", {
		schema: schema.atualizarRegraFiscalSchema,
		handler: atualizarRegraFiscal,
	});

	app.post("/regras-fiscais/:id/validar", {
		schema: schema.validarRegraFiscalSchema,
		handler: validarRegraFiscal,
	});

	app.post("/regras-fiscais/:id/rollback", {
		schema: schema.rollbackRegraFiscalSchema,
		handler: rollbackRegraFiscal,
	});
}
