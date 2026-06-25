import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarTaxaUf } from "./atualizar.js";
import { buscarTaxaUf } from "./buscar.js";
import { criarTaxaUf } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirTaxaUf } from "./excluir.js";
import { listarTaxaUf } from "./listar.js";

export async function taxaUfRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/taxas-uf", {
		schema: schema.criarTaxaUfSchema,
		handler: criarTaxaUf,
	});
	app.get("/taxas-uf", {
		schema: schema.listarTaxaUfSchema,
		handler: listarTaxaUf,
	});
	app.get("/taxas-uf/:id", {
		schema: schema.buscarTaxaUfSchema,
		handler: buscarTaxaUf,
	});
	app.put("/taxas-uf/:id", {
		schema: schema.atualizarTaxaUfSchema,
		handler: atualizarTaxaUf,
	});
	app.delete("/taxas-uf/:id", {
		schema: schema.excluirTaxaUfSchema,
		handler: excluirTaxaUf,
	});
}
