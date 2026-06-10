import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarOrdemServico } from "./atualizar.js";
import { buscarOrdemServico } from "./buscar.js";
import { criarOrdemServico } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirOrdemServico } from "./excluir.js";
import { listarOrdemServicos } from "./listar.js";

export async function ordensServicoRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.post("/ordens-servico", {
		schema: schema.criarOrdemServicoSchema,
		handler: criarOrdemServico,
	});
	app.get("/ordens-servico", {
		schema: schema.listarOrdemServicosSchema,
		handler: listarOrdemServicos,
	});
	app.get("/ordens-servico/:id", {
		schema: schema.buscarOrdemServicoSchema,
		handler: buscarOrdemServico,
	});
	app.put("/ordens-servico/:id", {
		schema: schema.atualizarOrdemServicoSchema,
		handler: atualizarOrdemServico,
	});
	app.delete("/ordens-servico/:id", {
		schema: schema.excluirOrdemServicoSchema,
		handler: excluirOrdemServico,
	});
}
