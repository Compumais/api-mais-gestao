import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { criarHandlerProximoCodigo } from "../shared/proximo-codigo-query.js";
import { criarProximoCodigoSchema } from "../shared/proximo-codigo-schema.js";
import { atualizarEquipamento } from "./atualizar.js";
import { buscarEquipamento } from "./buscar.js";
import { criarEquipamento } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirEquipamento } from "./excluir.js";
import { listarEquipamentos } from "./listar.js";

export async function equipamentosRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/equipamentos/proximo-codigo", {
		schema: criarProximoCodigoSchema("equipamentos", "string"),
		handler: criarHandlerProximoCodigo("equipamento"),
	});
	app.post("/equipamentos", {
		schema: schema.criarEquipamentoSchema,
		handler: criarEquipamento,
	});
	app.get("/equipamentos", {
		schema: schema.listarEquipamentosSchema,
		handler: listarEquipamentos,
	});
	app.get("/equipamentos/:id", {
		schema: schema.buscarEquipamentoSchema,
		handler: buscarEquipamento,
	});
	app.put("/equipamentos/:id", {
		schema: schema.atualizarEquipamentoSchema,
		handler: atualizarEquipamento,
	});
	app.delete("/equipamentos/:id", {
		schema: schema.excluirEquipamentoSchema,
		handler: excluirEquipamento,
	});
}
