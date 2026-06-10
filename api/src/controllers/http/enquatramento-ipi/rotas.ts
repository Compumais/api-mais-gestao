import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarEnquatramentoIpi } from "./atualizar.js";
import { buscarEnquatramentoIpi } from "./buscar.js";
import { criarEnquatramentoIpi } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirEnquatramentoIpi } from "./excluir.js";
import { listarEnquatramentoIpis } from "./listar.js";

export async function enquadramentosIpiRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/enquadramentos-ipi", {
		schema: schema.criarEnquatramentoIpiSchema,
		handler: criarEnquatramentoIpi,
	});
	app.get("/enquadramentos-ipi", {
		schema: schema.listarEnquatramentoIpisSchema,
		handler: listarEnquatramentoIpis,
	});
	app.get("/enquadramentos-ipi/:id", {
		schema: schema.buscarEnquatramentoIpiSchema,
		handler: buscarEnquatramentoIpi,
	});
	app.put("/enquadramentos-ipi/:id", {
		schema: schema.atualizarEnquatramentoIpiSchema,
		handler: atualizarEnquatramentoIpi,
	});
	app.delete("/enquadramentos-ipi/:id", {
		schema: schema.excluirEnquatramentoIpiSchema,
		handler: excluirEnquatramentoIpi,
	});
}
