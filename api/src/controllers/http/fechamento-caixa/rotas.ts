import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarFechamentoCaixa } from "./atualizar.js";
import { buscarFechamentoCaixa } from "./buscar.js";
import { criarFechamentoCaixa } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirFechamentoCaixa } from "./excluir.js";
import { listarFechamentosCaixa } from "./listar-fechamentos-caixa.js";

export async function fechamentosCaixaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/fechamentos-caixa", {
		schema: schema.criarFechamentoCaixaSchema,
		handler: criarFechamentoCaixa,
	});
	app.get("/fechamentos-caixa", {
		schema: schema.listarFechamentosCaixaSchema,
		handler: listarFechamentosCaixa,
	});
	app.get("/fechamentos-caixa/:id", {
		schema: schema.buscarFechamentoCaixaSchema,
		handler: buscarFechamentoCaixa,
	});
	app.put("/fechamentos-caixa/:id", {
		schema: schema.atualizarFechamentoCaixaSchema,
		handler: atualizarFechamentoCaixa,
	});
	app.delete("/fechamentos-caixa/:id", {
		schema: schema.excluirFechamentoCaixaSchema,
		handler: excluirFechamentoCaixa,
	});
}
