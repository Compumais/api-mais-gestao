import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarContaCorrenteLancamento } from "./atualizar.js";
import { buscarContaCorrenteLancamento } from "./buscar.js";
import { criarContaCorrenteLancamento } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirContaCorrenteLancamento } from "./excluir.js";
import { listarContaCorrenteLancamento } from "./listar.js";
import { previewImportacaoOfx } from "./preview-importacao-ofx.js";

export async function contaCorrenteLancamentoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/conta-corrente-lancamentos", {
		schema: schema.criarContaCorrenteLancamentoSchema,
		handler: criarContaCorrenteLancamento,
	});
	app.post("/conta-corrente-lancamentos/importar-ofx/preview", {
		schema: schema.previewImportacaoOfxSchema,
		handler: previewImportacaoOfx,
	});
	app.get("/conta-corrente-lancamentos", {
		schema: schema.listarContaCorrenteLancamentoSchema,
		handler: listarContaCorrenteLancamento,
	});
	app.get("/conta-corrente-lancamentos/:id", {
		schema: schema.buscarContaCorrenteLancamentoSchema,
		handler: buscarContaCorrenteLancamento,
	});
	app.put("/conta-corrente-lancamentos/:id", {
		schema: schema.atualizarContaCorrenteLancamentoSchema,
		handler: atualizarContaCorrenteLancamento,
	});
	app.delete("/conta-corrente-lancamentos/:id", {
		schema: schema.excluirContaCorrenteLancamentoSchema,
		handler: excluirContaCorrenteLancamento,
	});
}
