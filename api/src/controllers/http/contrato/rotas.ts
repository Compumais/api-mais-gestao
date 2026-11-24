import type { FastifyInstance } from "fastify";
import { MODULOS_SAAS } from "@/constants/saas-catalog.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { requireModulo } from "../../middleware/verify-plano.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { atualizarContrato } from "./atualizar.js";
import { buscarContrato } from "./buscar.js";
import { criarContrato } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirContrato } from "./excluir.js";
import { importarContratos } from "./importar.js";
import { previewImportacaoContratos } from "./importar-preview.js";
import { listarContratos } from "./listar.js";
import { vincularClienteImportacaoContratos } from "./vincular-cliente.js";

const LIMITE_BODY_IMPORTACAO = 20 * 1024 * 1024;

export async function contratosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireModulo(MODULOS_SAAS.CONTRATOS));

	app.get("/contratos/proximo-codigo", {
		schema: criarProximoCodigoSchema("contratos", "string"),
		handler: criarHandlerProximoCodigo("contrato"),
	});
	app.post("/contratos/importar/preview", {
		schema: schema.previewImportacaoContratosSchema,
		bodyLimit: LIMITE_BODY_IMPORTACAO,
		handler: previewImportacaoContratos,
	});
	app.post("/contratos/importar", {
		schema: schema.importarContratosSchema,
		bodyLimit: LIMITE_BODY_IMPORTACAO,
		handler: importarContratos,
	});
	app.post("/contratos/importar/vincular-cliente", {
		schema: schema.vincularClienteImportacaoContratosSchema,
		handler: vincularClienteImportacaoContratos,
	});
	app.post("/contratos", {
		schema: schema.criarContratoSchema,
		handler: criarContrato,
	});
	app.get("/contratos", {
		schema: schema.listarContratosSchema,
		handler: listarContratos,
	});
	app.get("/contratos/:id", {
		schema: schema.buscarContratoSchema,
		handler: buscarContrato,
	});
	app.put("/contratos/:id", {
		schema: schema.atualizarContratoSchema,
		handler: atualizarContrato,
	});
	app.delete("/contratos/:id", {
		schema: schema.excluirContratoSchema,
		handler: excluirContrato,
	});
}
