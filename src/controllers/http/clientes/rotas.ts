import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarCliente } from "./atualizar.js";
import { buscarCliente } from "./buscar.js";
import { criarCliente } from "./criar.js";
import * as schema from "./doc-schema/schemas.js";
import { excluirCliente } from "./excluir.js";
import { listarClientes } from "./listar-clientes.js";

export async function clientesRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/clientes", {
		schema: schema.criarClienteSchema,
		handler: criarCliente,
	});
	app.get("/clientes", {
		schema: schema.listarClientesSchema,
		handler: listarClientes,
	});
	app.get("/clientes/:id", {
		schema: schema.buscarClienteSchema,
		handler: buscarCliente,
	});
	app.put("/clientes/:id", {
		schema: schema.atualizarClienteSchema,
		handler: atualizarCliente,
	});
	app.delete("/clientes/:id", {
		schema: schema.excluirClienteSchema,
		handler: excluirCliente,
	});
}
