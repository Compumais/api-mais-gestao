import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { atualizarContaCorrente } from "./atualizar.js";
import { buscarContaCorrente } from "./buscar.js";
import { criarContaCorrente } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirContaCorrente } from "./excluir.js";
import { listarContasCorrentes } from "./listar.js";

export async function contaCorrenteRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/contas-correntes", {
		schema: schema.criarContaCorrenteSchema,
		handler: criarContaCorrente,
	});
	app.get("/contas-correntes", {
		schema: schema.listarContasCorrentesSchema,
		handler: listarContasCorrentes,
	});
	app.get("/contas-correntes/proximo-codigo", {
		schema: criarProximoCodigoSchema("contas-correntes", "number"),
		handler: criarHandlerProximoCodigo("conta-corrente"),
	});
	app.get("/contas-correntes/:id", {
		schema: schema.buscarContaCorrenteSchema,
		handler: buscarContaCorrente,
	});
	app.put("/contas-correntes/:id", {
		schema: schema.atualizarContaCorrenteSchema,
		handler: atualizarContaCorrente,
	});
	app.delete("/contas-correntes/:id", {
		schema: schema.excluirContaCorrenteSchema,
		handler: excluirContaCorrente,
	});
}
