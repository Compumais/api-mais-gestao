import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../middleware/verify-jwt.js";
import { criarEmpresa } from "./criar.js";

export async function empresasRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/empresas", criarEmpresa);
}
