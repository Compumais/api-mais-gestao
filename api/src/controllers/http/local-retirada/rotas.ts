import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarLocalRetirada } from "./atualizar.js";
import { buscarLocalRetirada } from "./buscar.js";
import { criarLocalRetirada } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirLocalRetirada } from "./excluir.js";
import { listarLocalRetiradas } from "./listar.js";

export async function locaisRetiradaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/locais-retirada", {
		schema: schema.criarLocalRetiradaSchema,
		handler: criarLocalRetirada,
	});
	app.get("/locais-retirada", {
		schema: schema.listarLocalRetiradasSchema,
		handler: listarLocalRetiradas,
	});
	app.get("/locais-retirada/:id", {
		schema: schema.buscarLocalRetiradaSchema,
		handler: buscarLocalRetirada,
	});
	app.put("/locais-retirada/:id", {
		schema: schema.atualizarLocalRetiradaSchema,
		handler: atualizarLocalRetirada,
	});
	app.delete("/locais-retirada/:id", {
		schema: schema.excluirLocalRetiradaSchema,
		handler: excluirLocalRetirada,
	});
}
