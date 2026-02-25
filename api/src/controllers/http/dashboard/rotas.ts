import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarDadosDashboard } from "./buscar-dados.js";
import { buscarHistoricoFinanceiro } from "./buscar-historico.js";

import { buscarUltimasMovimentacoes } from "./buscar-ultimas-movimentacoes.js";

export async function dashboardRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);

	app.get("/dashboard", {
		handler: buscarDadosDashboard,
	});

	app.get("/dashboard/historico", {
		handler: buscarHistoricoFinanceiro,
	});

	app.get("/dashboard/ultimas-movimentacoes", {
		handler: buscarUltimasMovimentacoes,
	});
}
