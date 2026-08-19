import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	ativarDominioIntegracaoSchema,
	buscarDominioIntegracaoSchema,
	listarDominioEnviosSchema,
	reenviarDominioEnvioSchema,
	salvarDominioIntegracaoSchema,
} from "./doc-schema/schema.js";
import { listarDominioEnvios, reenviarDominioEnvio } from "./envios.js";
import {
	ativarDominioIntegracao,
	buscarDominioIntegracao,
	salvarDominioIntegracao,
} from "./integracao.js";

export async function dominioRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/dominio/integracao", {
		schema: buscarDominioIntegracaoSchema,
		handler: buscarDominioIntegracao,
	});
	app.put("/dominio/integracao", {
		schema: salvarDominioIntegracaoSchema,
		handler: salvarDominioIntegracao,
	});
	app.post("/dominio/integracao/ativar", {
		schema: ativarDominioIntegracaoSchema,
		handler: ativarDominioIntegracao,
	});
	app.get("/dominio/envios", {
		schema: listarDominioEnviosSchema,
		handler: listarDominioEnvios,
	});
	app.post("/dominio/envios/:id/reenviar", {
		schema: reenviarDominioEnvioSchema,
		handler: reenviarDominioEnvio,
	});
}
