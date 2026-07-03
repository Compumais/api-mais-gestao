import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarPlanoContas } from "./atualizar.js";
import { buscarPlanoContas } from "./buscar.js";
import { criarPlanoContas } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirPlanoContas } from "./excluir.js";
import { importarPlanoContas } from "./importar.js";
import { previewImportacaoPlanoContas } from "./importar-preview.js";
import { listarPlanoContas } from "./listar.js";
import { moverPlanoContas } from "./mover.js";
import { templatePlanoContas } from "./template.js";

const LIMITE_BODY_IMPORTACAO = 20 * 1024 * 1024;

export function planoContasRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/plano-contas", {
		schema: schema.criarPlanoContasSchema,
		handler: criarPlanoContas,
	});

	app.get("/plano-contas", {
		schema: schema.listarPlanoContasSchema,
		handler: listarPlanoContas,
	});

	app.post("/plano-contas/importar/preview", {
		schema: schema.previewImportacaoPlanoContasSchema,
		bodyLimit: LIMITE_BODY_IMPORTACAO,
		handler: previewImportacaoPlanoContas,
	});

	app.post("/plano-contas/importar", {
		schema: schema.importarPlanoContasSchema,
		bodyLimit: LIMITE_BODY_IMPORTACAO,
		handler: importarPlanoContas,
	});

	app.get("/plano-contas/template", {
		schema: schema.templatePlanoContasSchema,
		handler: templatePlanoContas,
	});

	app.put("/plano-contas/mover", {
		schema: schema.moverPlanoContasSchema,
		handler: moverPlanoContas,
	});

	app.get("/plano-contas/:id", {
		schema: schema.buscarPlanoContasSchema,
		handler: buscarPlanoContas,
	});

	app.put("/plano-contas/:id", {
		schema: schema.atualizarPlanoContasSchema,
		handler: atualizarPlanoContas,
	});

	app.delete("/plano-contas/:id", {
		schema: schema.excluirPlanoContasSchema,
		handler: excluirPlanoContas,
	});
}
