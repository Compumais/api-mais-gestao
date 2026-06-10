import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarUnidadeMedida } from "./atualizar.js";
import { buscarUnidadeMedida } from "./buscar.js";
import { criarUnidadeMedida } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirUnidadeMedida } from "./excluir.js";
import { listarUnidadeMedidas } from "./listar.js";

export async function unidadesMedidaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/unidades-medida", {
		schema: schema.criarUnidadeMedidaSchema,
		handler: criarUnidadeMedida,
	});
	app.get("/unidades-medida", {
		schema: schema.listarUnidadeMedidasSchema,
		handler: listarUnidadeMedidas,
	});
	app.get("/unidades-medida/:id", {
		schema: schema.buscarUnidadeMedidaSchema,
		handler: buscarUnidadeMedida,
	});
	app.put("/unidades-medida/:id", {
		schema: schema.atualizarUnidadeMedidaSchema,
		handler: atualizarUnidadeMedida,
	});
	app.delete("/unidades-medida/:id", {
		schema: schema.excluirUnidadeMedidaSchema,
		handler: excluirUnidadeMedida,
	});
}
