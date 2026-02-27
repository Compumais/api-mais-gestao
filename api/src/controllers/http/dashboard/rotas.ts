import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarDadosDashboard } from "./buscar-dados.js";
import { buscarHistoricoFinanceiro } from "./buscar-historico.js";
import { buscarTopDespesasPorCategoria } from "./buscar-top-despesas-categoria.js";
import { buscarTopReceitasPorCategoria } from "./buscar-top-receitas-categoria.js";
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

	app.get("/dashboard/top-despesas-categoria", {
		handler: buscarTopDespesasPorCategoria,
	});

	app.get("/dashboard/top-receitas-categoria", {
		handler: buscarTopReceitasPorCategoria,
	});
}
