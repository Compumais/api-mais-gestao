import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarEntidade } from "./atualizar.js";
import { buscarEntidade } from "./buscar.js";
import { consultarCnpj } from "./consultar-cnpj.js";
import { criarEntidade } from "./criar.js";
import { criarEntidadePorCnpj } from "./criar-por-cnpj.js";
import * as schema from "./doc-schema/schemas.js";
import { excluirEntidade } from "./excluir.js";
import { exportarEntidades } from "./exportar.js";
import { importarEntidades } from "./importar.js";
import { previewImportacaoEntidades } from "./importar-preview.js";
import { listarEntidades } from "./listar-entidades.js";
import { templateEntidades } from "./template.js";

export async function entidadesRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/entidades", {
		schema: schema.criarEntidadeSchema,
		handler: criarEntidade,
	});
	app.get("/entidades", {
		schema: schema.listarEntidadesSchema,
		handler: listarEntidades,
	});
	app.get("/entidades/exportar", {
		schema: schema.exportarEntidadesSchema,
		handler: exportarEntidades,
	});
	app.get("/entidades/template", {
		schema: schema.templateEntidadesSchema,
		handler: templateEntidades,
	});
	app.post("/entidades/importar/preview", {
		schema: schema.previewImportacaoEntidadesSchema,
		handler: previewImportacaoEntidades,
	});
	app.post("/entidades/importar", {
		schema: schema.importarEntidadesSchema,
		handler: importarEntidades,
	});
	app.get("/entidades/cnpj/:cnpj", {
		schema: schema.consultarCnpjEntidadeSchema,
		handler: consultarCnpj,
	});
	app.post("/entidades/cnpj", {
		schema: schema.criarEntidadePorCnpjSchema,
		handler: criarEntidadePorCnpj,
	});
	app.get("/entidades/:id", {
		schema: schema.buscarEntidadeSchema,
		handler: buscarEntidade,
	});
	app.put("/entidades/:id", {
		schema: schema.atualizarEntidadeSchema,
		handler: atualizarEntidade,
	});
	app.delete("/entidades/:id", {
		schema: schema.excluirEntidadeSchema,
		handler: excluirEntidade,
	});
}
