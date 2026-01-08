import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt";
import { perfil } from "./perfil";

export async function authRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.get("/auth/perfil", perfil);
}
