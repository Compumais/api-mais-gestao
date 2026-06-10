import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarTipoProblema } from "./atualizar.js";
import { buscarTipoProblema } from "./buscar.js";
import { criarTipoProblema } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirTipoProblema } from "./excluir.js";
import { listarTipoProblemas } from "./listar.js";

export async function tiposProblemaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/tipos-problema", {
		schema: schema.criarTipoProblemaSchema,
		handler: criarTipoProblema,
	});
	app.get("/tipos-problema", {
		schema: schema.listarTipoProblemasSchema,
		handler: listarTipoProblemas,
	});
	app.get("/tipos-problema/:id", {
		schema: schema.buscarTipoProblemaSchema,
		handler: buscarTipoProblema,
	});
	app.put("/tipos-problema/:id", {
		schema: schema.atualizarTipoProblemaSchema,
		handler: atualizarTipoProblema,
	});
	app.delete("/tipos-problema/:id", {
		schema: schema.excluirTipoProblemaSchema,
		handler: excluirTipoProblema,
	});
}
