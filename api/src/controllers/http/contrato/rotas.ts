import type { FastifyInstance } from "fastify";
import { MODULOS_SAAS } from "@/constants/saas-catalog.js";
import { requireModulo } from "../../middleware/verify-plano.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { atualizarContrato } from "./atualizar.js";
import { buscarContrato } from "./buscar.js";
import { criarContrato } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirContrato } from "./excluir.js";
import { listarContratos } from "./listar.js";

export async function contratosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireModulo(MODULOS_SAAS.CONTRATOS));

	app.get("/contratos/proximo-codigo", {
		schema: criarProximoCodigoSchema("contratos", "string"),
		handler: criarHandlerProximoCodigo("contrato"),
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
