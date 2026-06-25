import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarParametrizacaoTributos } from "./atualizar.js";
import { buscarParametrizacaoTributos } from "./buscar.js";
import { criarParametrizacaoTributos } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirParametrizacaoTributos } from "./excluir.js";
import { listarParametrizacaoTributos } from "./listar.js";

export async function parametrizacaoTributosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/parametrizacao-tributos", {
		schema: schema.listarParametrizacaoTributosSchema,
		handler: listarParametrizacaoTributos,
	});

	app.get("/parametrizacao-tributos/:id", {
		schema: schema.buscarParametrizacaoTributosSchema,
		handler: buscarParametrizacaoTributos,
	});

	app.post("/parametrizacao-tributos", {
		schema: schema.criarParametrizacaoTributosSchema,
		handler: criarParametrizacaoTributos,
	});

	app.put("/parametrizacao-tributos/:id", {
		schema: schema.atualizarParametrizacaoTributosSchema,
		handler: atualizarParametrizacaoTributos,
	});

	app.delete("/parametrizacao-tributos/:id", {
		schema: schema.excluirParametrizacaoTributosSchema,
		handler: excluirParametrizacaoTributos,
	});
}
