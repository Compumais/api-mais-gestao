import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	atualizarNfceConfiguracao,
	buscarNfceConfiguracao,
} from "./nfce-configuracao.js";

export async function nfceConfiguracaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/empresas/:id/nfce-configuracao", {
		handler: buscarNfceConfiguracao,
	});
	app.put("/empresas/:id/nfce-configuracao", {
		handler: atualizarNfceConfiguracao,
	});
}
