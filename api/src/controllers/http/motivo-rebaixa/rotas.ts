import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarMotivoRebaixa } from "./atualizar.js";
import { buscarMotivoRebaixa } from "./buscar.js";
import { criarMotivoRebaixa } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirMotivoRebaixa } from "./excluir.js";
import { listarMotivoRebaixas } from "./listar.js";

export async function motivosRebaixaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/motivos-rebaixa", {
		schema: schema.criarMotivoRebaixaSchema,
		handler: criarMotivoRebaixa,
	});
	app.get("/motivos-rebaixa", {
		schema: schema.listarMotivoRebaixasSchema,
		handler: listarMotivoRebaixas,
	});
	app.get("/motivos-rebaixa/:id", {
		schema: schema.buscarMotivoRebaixaSchema,
		handler: buscarMotivoRebaixa,
	});
	app.put("/motivos-rebaixa/:id", {
		schema: schema.atualizarMotivoRebaixaSchema,
		handler: atualizarMotivoRebaixa,
	});
	app.delete("/motivos-rebaixa/:id", {
		schema: schema.excluirMotivoRebaixaSchema,
		handler: excluirMotivoRebaixa,
	});
}
