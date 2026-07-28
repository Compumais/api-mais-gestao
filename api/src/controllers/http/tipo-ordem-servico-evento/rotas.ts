import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import * as schema from "./doc-schema/schema.js";
import {
	atualizarTipoOrdemServicoEvento,
	excluirTipoOrdemServicoEvento,
	listarTiposOrdemServicoEvento,
} from "./tipo-ordem-servico-evento.js";

export async function tiposOrdemServicoEventoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/tipos-ordem-servico-evento", {
		schema: schema.listarTiposOrdemServicoEventoSchema,
		handler: listarTiposOrdemServicoEvento,
	});
	app.put("/tipos-ordem-servico-evento/:id", {
		schema: schema.atualizarTipoOrdemServicoEventoSchema,
		handler: atualizarTipoOrdemServicoEvento,
	});
	app.delete("/tipos-ordem-servico-evento/:id", {
		schema: schema.excluirTipoOrdemServicoEventoSchema,
		handler: excluirTipoOrdemServicoEvento,
	});
}
