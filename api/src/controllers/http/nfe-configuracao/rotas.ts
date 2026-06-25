import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	atualizarNfeConfiguracao,
	buscarNfeConfiguracao,
} from "./nfe-configuracao.js";

export async function nfeConfiguracaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/empresas/:id/nfe-configuracao", {
		handler: buscarNfeConfiguracao,
	});
	app.put("/empresas/:id/nfe-configuracao", {
		handler: atualizarNfeConfiguracao,
	});
}
