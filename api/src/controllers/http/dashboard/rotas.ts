import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { buscarComparativo } from "./buscar-comparativo.js";
import { buscarControlePlanoContas } from "./buscar-controle-plano-contas.js";
import { buscarDadosDashboard } from "./buscar-dados.js";
import { buscarDre } from "./buscar-dre.js";
import { buscarEvolucaoMensal } from "./buscar-evolucao-mensal.js";
import { buscarFinanceiroResumo } from "./buscar-financeiro-resumo.js";
import { buscarHistoricoFinanceiro } from "./buscar-historico.js";
import { buscarTopDespesasPorCategoria } from "./buscar-top-despesas-categoria.js";
import { buscarTopDespesasValor } from "./buscar-top-despesas-valor.js";
import { buscarTopProdutos } from "./buscar-top-produtos.js";
import { buscarTopReceitasPorCategoria } from "./buscar-top-receitas-categoria.js";
import { buscarUltimasMovimentacoes } from "./buscar-ultimas-movimentacoes.js";
import { buscarUltimosFechamentos } from "./buscar-ultimos-fechamentos.js";
import { buscarVendas } from "./buscar-vendas.js";
import { buscarVendasHistorico } from "./buscar-vendas-historico.js";

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

	app.get("/dashboard/financeiro-resumo", {
		handler: buscarFinanceiroResumo,
	});

	app.get("/dashboard/evolucao-mensal", {
		handler: buscarEvolucaoMensal,
	});

	app.get("/dashboard/top-despesas-valor", {
		handler: buscarTopDespesasValor,
	});

	app.get("/dashboard/vendas", {
		handler: buscarVendas,
	});

	app.get("/dashboard/vendas-historico", {
		handler: buscarVendasHistorico,
	});

	app.get("/dashboard/top-produtos", {
		handler: buscarTopProdutos,
	});

	app.get("/dashboard/ultimos-fechamentos", {
		handler: buscarUltimosFechamentos,
	});

	app.get("/dashboard/controle-plano-contas", {
		handler: buscarControlePlanoContas,
	});

	app.get("/dashboard/dre", {
		handler: buscarDre,
	});

	app.get("/dashboard/comparativo", {
		handler: buscarComparativo,
	});
}
