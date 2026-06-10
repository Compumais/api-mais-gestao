import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarCentroCusto } from "./atualizar.js";
import { buscarCentroCusto } from "./buscar.js";
import { criarCentroCusto } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirCentroCusto } from "./excluir.js";
import { listarCentroCustos } from "./listar.js";

export async function centrosCustoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/centros-custo", {
		schema: schema.criarCentroCustoSchema,
		handler: criarCentroCusto,
	});
	app.get("/centros-custo", {
		schema: schema.listarCentroCustosSchema,
		handler: listarCentroCustos,
	});
	app.get("/centros-custo/:id", {
		schema: schema.buscarCentroCustoSchema,
		handler: buscarCentroCusto,
	});
	app.put("/centros-custo/:id", {
		schema: schema.atualizarCentroCustoSchema,
		handler: atualizarCentroCusto,
	});
	app.delete("/centros-custo/:id", {
		schema: schema.excluirCentroCustoSchema,
		handler: excluirCentroCusto,
	});
}
