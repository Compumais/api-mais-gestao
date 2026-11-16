import type { FastifyInstance } from "fastify";
import { MODULOS_SAAS } from "@/constants/saas-catalog.js";
import { requireModulo } from "../../middleware/verify-plano.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { atualizarGrupoContrato } from "./atualizar.js";
import { buscarGrupoContrato } from "./buscar.js";
import { criarGrupoContrato } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirGrupoContrato } from "./excluir.js";
import { listarGruposContrato } from "./listar.js";

export async function gruposContratoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireModulo(MODULOS_SAAS.CONTRATOS));

	app.get("/grupos-contrato/proximo-codigo", {
		schema: criarProximoCodigoSchema("grupos-contrato", "number"),
		handler: criarHandlerProximoCodigo("grupo-contrato"),
	});
	app.post("/grupos-contrato", {
		schema: schema.criarGrupoContratoSchema,
		handler: criarGrupoContrato,
	});
	app.get("/grupos-contrato", {
		schema: schema.listarGruposContratoSchema,
		handler: listarGruposContrato,
	});
	app.get("/grupos-contrato/:id", {
		schema: schema.buscarGrupoContratoSchema,
		handler: buscarGrupoContrato,
	});
	app.put("/grupos-contrato/:id", {
		schema: schema.atualizarGrupoContratoSchema,
		handler: atualizarGrupoContrato,
	});
	app.delete("/grupos-contrato/:id", {
		schema: schema.excluirGrupoContratoSchema,
		handler: excluirGrupoContrato,
	});
}
