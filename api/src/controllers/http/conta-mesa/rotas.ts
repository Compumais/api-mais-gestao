import type { FastifyInstance } from "fastify";
import { MODULOS_SAAS } from "@/constants/saas-catalog.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { requireModulo } from "../../middleware/verify-plano.js";
import { atualizarContaMesa } from "./atualizar.js";
import { buscarContaMesa } from "./buscar.js";
import { criarContaMesa } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirContaMesa } from "./excluir.js";
import { fecharFatiaItensContaMesa } from "./fechar-fatia-itens.js";
import { listarContasMesa } from "./listar.js";

export async function contasMesaRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", requireModulo(MODULOS_SAAS.GOURMET));

	app.post("/contas-mesa", {
		schema: schema.criarContaMesaSchema,
		handler: criarContaMesa,
	});
	app.get("/contas-mesa", {
		schema: schema.listarContasMesaSchema,
		handler: listarContasMesa,
	});
	app.get("/contas-mesa/:id", {
		schema: schema.buscarContaMesaSchema,
		handler: buscarContaMesa,
	});
	app.put("/contas-mesa/:id", {
		schema: schema.atualizarContaMesaSchema,
		handler: atualizarContaMesa,
	});
	app.post("/contas-mesa/:id/fatia-itens", {
		schema: schema.fecharFatiaItensContaMesaSchema,
		handler: fecharFatiaItensContaMesa,
	});
	app.delete("/contas-mesa/:id", {
		schema: schema.excluirContaMesaSchema,
		handler: excluirContaMesa,
	});
}
