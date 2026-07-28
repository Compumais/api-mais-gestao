import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import {
	atualizarConfiguracaoOrdemServico,
	buscarConfiguracaoOrdemServico,
} from "./configuracao-ordem-servico.js";
import * as schema from "./doc-schema/schema.js";

export async function configuracaoOrdemServicoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/empresas/:idempresa/configuracao-ordem-servico", {
		schema: schema.buscarConfiguracaoOrdemServicoSchema,
		handler: buscarConfiguracaoOrdemServico,
	});
	app.put("/empresas/:idempresa/configuracao-ordem-servico", {
		schema: schema.atualizarConfiguracaoOrdemServicoSchema,
		handler: atualizarConfiguracaoOrdemServico,
	});
}
