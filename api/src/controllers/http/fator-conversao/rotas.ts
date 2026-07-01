import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarFatorConversao } from "./atualizar.js";
import { buscarFatorConversao } from "./buscar.js";
import { criarFatorConversao } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirFatorConversao } from "./excluir.js";
import { listarFatoresConversao } from "./listar.js";

export async function fatoresConversaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/fatores-conversao", {
		schema: schema.criarFatorConversaoSchema,
		handler: criarFatorConversao,
	});
	app.get("/fatores-conversao", {
		schema: schema.listarFatoresConversaoSchema,
		handler: listarFatoresConversao,
	});
	app.get("/fatores-conversao/:id", {
		schema: schema.buscarFatorConversaoSchema,
		handler: buscarFatorConversao,
	});
	app.put("/fatores-conversao/:id", {
		schema: schema.atualizarFatorConversaoSchema,
		handler: atualizarFatorConversao,
	});
	app.delete("/fatores-conversao/:id", {
		schema: schema.excluirFatorConversaoSchema,
		handler: excluirFatorConversao,
	});
}
