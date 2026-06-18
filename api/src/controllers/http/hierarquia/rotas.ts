import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { atualizarHierarquia } from "./atualizar.js";
import { buscarHierarquia } from "./buscar.js";
import { criarHierarquia } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirHierarquia } from "./excluir.js";
import { listarHierarquias } from "./listar.js";

export async function hierarquiasRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/hierarquias", {
		schema: schema.criarHierarquiaSchema,
		handler: criarHierarquia,
	});
	app.get("/hierarquias", {
		schema: schema.listarHierarquiasSchema,
		handler: listarHierarquias,
	});
	app.get("/hierarquias/proximo-codigo", {
		schema: criarProximoCodigoSchema("hierarquias", "string"),
		handler: criarHandlerProximoCodigo("hierarquia"),
	});
	app.get("/hierarquias/:id", {
		schema: schema.buscarHierarquiaSchema,
		handler: buscarHierarquia,
	});
	app.put("/hierarquias/:id", {
		schema: schema.atualizarHierarquiaSchema,
		handler: atualizarHierarquia,
	});
	app.delete("/hierarquias/:id", {
		schema: schema.excluirHierarquiaSchema,
		handler: excluirHierarquia,
	});
}
