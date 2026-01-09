import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarContaCorrente } from "./criar.js";
import { listarContasCorrentes } from "./listar.js";

export async function contaCorrenteRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/contas-correntes", criarContaCorrente);
	app.get("/contas-correntes", listarContasCorrentes);
}
