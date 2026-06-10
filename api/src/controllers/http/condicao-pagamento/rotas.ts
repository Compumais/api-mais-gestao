import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarCondicaoPagamento } from "./atualizar.js";
import { buscarCondicaoPagamento } from "./buscar.js";
import { criarCondicaoPagamento } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirCondicaoPagamento } from "./excluir.js";
import { listarCondicaoPagamentos } from "./listar.js";

export async function condicoesPagamentoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/condicoes-pagamento", {
		schema: schema.criarCondicaoPagamentoSchema,
		handler: criarCondicaoPagamento,
	});
	app.get("/condicoes-pagamento", {
		schema: schema.listarCondicaoPagamentosSchema,
		handler: listarCondicaoPagamentos,
	});
	app.get("/condicoes-pagamento/:id", {
		schema: schema.buscarCondicaoPagamentoSchema,
		handler: buscarCondicaoPagamento,
	});
	app.put("/condicoes-pagamento/:id", {
		schema: schema.atualizarCondicaoPagamentoSchema,
		handler: atualizarCondicaoPagamento,
	});
	app.delete("/condicoes-pagamento/:id", {
		schema: schema.excluirCondicaoPagamentoSchema,
		handler: excluirCondicaoPagamento,
	});
}
