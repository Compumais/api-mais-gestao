import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarTipoCobranca } from "./atualizar.js";
import { buscarTipoCobranca } from "./buscar.js";
import { criarTipoCobranca } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirTipoCobranca } from "./excluir.js";
import { listarTiposCobranca } from "./listar.js";

export async function tiposCobrancaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/tipos-cobranca", {
		schema: schema.criarTipoCobrancaSchema,
		handler: criarTipoCobranca,
	});
	app.get("/tipos-cobranca", {
		schema: schema.listarTiposCobrancaSchema,
		handler: listarTiposCobranca,
	});
	app.get("/tipos-cobranca/:id", {
		schema: schema.buscarTipoCobrancaSchema,
		handler: buscarTipoCobranca,
	});
	app.put("/tipos-cobranca/:id", {
		schema: schema.atualizarTipoCobrancaSchema,
		handler: atualizarTipoCobranca,
	});
	app.delete("/tipos-cobranca/:id", {
		schema: schema.excluirTipoCobrancaSchema,
		handler: excluirTipoCobranca,
	});
}
