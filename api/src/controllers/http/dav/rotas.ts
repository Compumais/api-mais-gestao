import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarDav } from "./atualizar.js";
import { buscarDav } from "./buscar.js";
import { criarDav } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirDav } from "./excluir.js";
import { listarDavs } from "./listar.js";

export async function davsRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/davs", {
		schema: schema.criarDavSchema,
		handler: criarDav,
	});
	app.get("/davs", {
		schema: schema.listarDavsSchema,
		handler: listarDavs,
	});
	app.get("/davs/:id", {
		schema: schema.buscarDavSchema,
		handler: buscarDav,
	});
	app.put("/davs/:id", {
		schema: schema.atualizarDavSchema,
		handler: atualizarDav,
	});
	app.delete("/davs/:id", {
		schema: schema.excluirDavSchema,
		handler: excluirDav,
	});
}
