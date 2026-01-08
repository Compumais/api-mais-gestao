import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarCliente } from "./atualizar.js";
import { buscarCliente } from "./buscar.js";
import { criarCliente } from "./criar.js";
import { excluirCliente } from "./excluir.js";
import { listarClientes } from "./listar-clientes.js";

export async function clientesRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/clientes", criarCliente);
	app.get("/clientes", listarClientes);
	app.get("/clientes/:id", buscarCliente);
	app.put("/clientes/:id", atualizarCliente);
	app.delete("/clientes/:id", excluirCliente);
}
