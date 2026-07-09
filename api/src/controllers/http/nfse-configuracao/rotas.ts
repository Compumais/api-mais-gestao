import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	atualizarNfseConfiguracao,
	buscarNfseConfiguracao,
} from "./nfse-configuracao.js";

export async function nfseConfiguracaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/empresas/:id/nfse-configuracao", {
		handler: buscarNfseConfiguracao,
	});
	app.put("/empresas/:id/nfse-configuracao", {
		handler: atualizarNfseConfiguracao,
	});
}
