import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarContaCorrente } from "./atualizar.js";
import { buscarContaCorrente } from "./buscar.js";
import { criarContaCorrente } from "./criar.js";
import { excluirContaCorrente } from "./excluir.js";
import { listarContasCorrentes } from "./listar.js";

export async function contaCorrenteRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/contas-correntes", criarContaCorrente);
	app.get("/contas-correntes", listarContasCorrentes);
	app.get("/contas-correntes/:id", buscarContaCorrente);
	app.put("/contas-correntes/:id", atualizarContaCorrente);
	app.delete("/contas-correntes/:id", excluirContaCorrente);
}
