import type { FastifyInstance } from "fastify";
import { MODULOS_SAAS } from "@/constants/saas-catalog.js";
import { requireModulo } from "../../middleware/verify-plano.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { atualizarTipoContrato } from "./atualizar.js";
import { buscarTipoContrato } from "./buscar.js";
import { criarTipoContrato } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirTipoContrato } from "./excluir.js";
import { listarTiposContrato } from "./listar.js";

export async function tiposContratoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireModulo(MODULOS_SAAS.CONTRATOS));

	app.get("/tipos-contrato/proximo-codigo", {
		schema: criarProximoCodigoSchema("tipos-contrato", "number"),
		handler: criarHandlerProximoCodigo("tipo-contrato"),
	});
	app.post("/tipos-contrato", {
		schema: schema.criarTipoContratoSchema,
		handler: criarTipoContrato,
	});
	app.get("/tipos-contrato", {
		schema: schema.listarTiposContratoSchema,
		handler: listarTiposContrato,
	});
	app.get("/tipos-contrato/:id", {
		schema: schema.buscarTipoContratoSchema,
		handler: buscarTipoContrato,
	});
	app.put("/tipos-contrato/:id", {
		schema: schema.atualizarTipoContratoSchema,
		handler: atualizarTipoContrato,
	});
	app.delete("/tipos-contrato/:id", {
		schema: schema.excluirTipoContratoSchema,
		handler: excluirTipoContrato,
	});
}
