import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarDepartamento } from "./atualizar.js";
import { buscarDepartamento } from "./buscar.js";
import { criarDepartamento } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirDepartamento } from "./excluir.js";
import { listarDepartamentos } from "./listar.js";

export async function departamentosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/departamentos", {
		schema: schema.criarDepartamentoSchema,
		handler: criarDepartamento,
	});
	app.get("/departamentos", {
		schema: schema.listarDepartamentosSchema,
		handler: listarDepartamentos,
	});
	app.get("/departamentos/:id", {
		schema: schema.buscarDepartamentoSchema,
		handler: buscarDepartamento,
	});
	app.put("/departamentos/:id", {
		schema: schema.atualizarDepartamentoSchema,
		handler: atualizarDepartamento,
	});
	app.delete("/departamentos/:id", {
		schema: schema.excluirDepartamentoSchema,
		handler: excluirDepartamento,
	});
}
