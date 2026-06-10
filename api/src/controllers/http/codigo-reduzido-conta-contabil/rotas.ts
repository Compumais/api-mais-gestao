import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarCodigoReduzidoContaContabil } from "./atualizar.js";
import { buscarCodigoReduzidoContaContabil } from "./buscar.js";
import { criarCodigoReduzidoContaContabil } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirCodigoReduzidoContaContabil } from "./excluir.js";
import { listarCodigoReduzidoContaContabils } from "./listar.js";

export async function codigosReduzidosContaContabilRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/codigos-reduzidos-conta-contabil", {
		schema: schema.criarCodigoReduzidoContaContabilSchema,
		handler: criarCodigoReduzidoContaContabil,
	});
	app.get("/codigos-reduzidos-conta-contabil", {
		schema: schema.listarCodigoReduzidoContaContabilsSchema,
		handler: listarCodigoReduzidoContaContabils,
	});
	app.get("/codigos-reduzidos-conta-contabil/:id", {
		schema: schema.buscarCodigoReduzidoContaContabilSchema,
		handler: buscarCodigoReduzidoContaContabil,
	});
	app.put("/codigos-reduzidos-conta-contabil/:id", {
		schema: schema.atualizarCodigoReduzidoContaContabilSchema,
		handler: atualizarCodigoReduzidoContaContabil,
	});
	app.delete("/codigos-reduzidos-conta-contabil/:id", {
		schema: schema.excluirCodigoReduzidoContaContabilSchema,
		handler: excluirCodigoReduzidoContaContabil,
	});
}
