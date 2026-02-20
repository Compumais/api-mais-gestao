import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarConfiguracaoUsuario } from "./atualizar.js";
import { buscarConfiguracaoUsuario } from "./buscar.js";
import * as schema from "./doc-schema/schema.js";

export async function configuracaoUsuarioRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/configuracoes-usuario", {
		schema: schema.buscarConfiguracaoUsuarioSchema,
		handler: buscarConfiguracaoUsuario,
	});

	app.put("/configuracoes-usuario", {
		schema: schema.atualizarConfiguracaoUsuarioSchema,
		handler: atualizarConfiguracaoUsuario,
	});
}

