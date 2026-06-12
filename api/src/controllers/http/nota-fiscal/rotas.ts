import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarNotaFiscal } from "./atualizar.js";
import { buscarNotaFiscal } from "./buscar.js";
import { criarNotaFiscal } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirNotaFiscal } from "./excluir.js";
import { listarNotasFiscais } from "./listar.js";

export async function notasFiscaisRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/notas-fiscais", {
		schema: schema.criarNotaFiscalSchema,
		handler: criarNotaFiscal,
	});
	app.get("/notas-fiscais", {
		schema: schema.listarNotasFiscaisSchema,
		handler: listarNotasFiscais,
	});
	app.get("/notas-fiscais/:id", {
		schema: schema.buscarNotaFiscalSchema,
		handler: buscarNotaFiscal,
	});
	app.put("/notas-fiscais/:id", {
		schema: schema.atualizarNotaFiscalSchema,
		handler: atualizarNotaFiscal,
	});
	app.delete("/notas-fiscais/:id", {
		schema: schema.excluirNotaFiscalSchema,
		handler: excluirNotaFiscal,
	});
}
