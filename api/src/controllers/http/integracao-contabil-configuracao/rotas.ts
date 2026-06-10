import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarIntegracaoContabilConfiguracao } from "./atualizar.js";
import { buscarIntegracaoContabilConfiguracao } from "./buscar.js";
import { criarIntegracaoContabilConfiguracao } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirIntegracaoContabilConfiguracao } from "./excluir.js";
import { listarIntegracaoContabilConfiguracaos } from "./listar.js";

export async function integracoesContabilConfiguracaoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/integracoes-contabil-configuracao", {
		schema: schema.criarIntegracaoContabilConfiguracaoSchema,
		handler: criarIntegracaoContabilConfiguracao,
	});
	app.get("/integracoes-contabil-configuracao", {
		schema: schema.listarIntegracaoContabilConfiguracaosSchema,
		handler: listarIntegracaoContabilConfiguracaos,
	});
	app.get("/integracoes-contabil-configuracao/:id", {
		schema: schema.buscarIntegracaoContabilConfiguracaoSchema,
		handler: buscarIntegracaoContabilConfiguracao,
	});
	app.put("/integracoes-contabil-configuracao/:id", {
		schema: schema.atualizarIntegracaoContabilConfiguracaoSchema,
		handler: atualizarIntegracaoContabilConfiguracao,
	});
	app.delete("/integracoes-contabil-configuracao/:id", {
		schema: schema.excluirIntegracaoContabilConfiguracaoSchema,
		handler: excluirIntegracaoContabilConfiguracao,
	});
}
