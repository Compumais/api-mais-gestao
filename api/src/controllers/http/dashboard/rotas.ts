import type { FastifyInstance } from "fastify";
import { FEATURES_SAAS } from "@/constants/saas-catalog.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { requireFeature } from "../../middleware/verify-plano.js";
import { buscarClientesAnalytics } from "./buscar-clientes-analytics.js";
import { buscarClientesRfm } from "./buscar-clientes-rfm.js";
import { buscarComparativo } from "./buscar-comparativo.js";
import { buscarComparativoFlexivel } from "./buscar-comparativo-flexivel.js";
import { buscarControlePlanoContas } from "./buscar-controle-plano-contas.js";
import { buscarDadosDashboard } from "./buscar-dados.js";
import { buscarDre } from "./buscar-dre.js";
import { buscarDreAvancado } from "./buscar-dre-avancado.js";
import { buscarEvolucaoMensal } from "./buscar-evolucao-mensal.js";
import { buscarExecutivo } from "./buscar-executivo.js";
import { buscarFinanceiroResumo } from "./buscar-financeiro-resumo.js";
import { buscarFinanceiroSaude } from "./buscar-financeiro-saude.js";
import { buscarFluxoCaixa } from "./buscar-fluxo-caixa.js";
import { buscarHistoricoFinanceiro } from "./buscar-historico.js";
import { buscarInsights } from "./buscar-insights.js";
import { buscarMatrizProdutos } from "./buscar-matriz-produtos.js";
import { buscarRentabilidade } from "./buscar-rentabilidade.js";
import { buscarTopDespesasPorCategoria } from "./buscar-top-despesas-categoria.js";
import { buscarTopDespesasValor } from "./buscar-top-despesas-valor.js";
import { buscarTopProdutos } from "./buscar-top-produtos.js";
import { buscarTopProdutosAvancado } from "./buscar-top-produtos-avancado.js";
import { buscarTopReceitasPorCategoria } from "./buscar-top-receitas-categoria.js";
import { buscarUltimasMovimentacoes } from "./buscar-ultimas-movimentacoes.js";
import { buscarUltimosFechamentos } from "./buscar-ultimos-fechamentos.js";
import { buscarVendas } from "./buscar-vendas.js";
import { buscarVendasAvancadas } from "./buscar-vendas-avancadas.js";
import { buscarVendasHistorico } from "./buscar-vendas-historico.js";
import { buscarVendasPorDiaSemana } from "./buscar-vendas-por-dia-semana.js";
import { buscarVendasPorHora } from "./buscar-vendas-por-hora.js";
import {
	atualizarMetaDashboard,
	buscarMetasAcompanhamento,
	criarMetaDashboard,
	excluirMetaDashboard,
	listarMetas,
} from "./metas.js";

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

	/* Analytics — base (simplificado) */
	app.get("/dashboard/executivo", {
		handler: buscarExecutivo,
	});

	app.get("/dashboard/vendas-avancadas", {
		handler: buscarVendasAvancadas,
	});

	app.get("/dashboard/vendas-por-hora", {
		handler: buscarVendasPorHora,
	});

	app.get("/dashboard/vendas-por-dia-semana", {
		handler: buscarVendasPorDiaSemana,
	});

	app.get("/dashboard/top-produtos-avancado", {
		handler: buscarTopProdutosAvancado,
	});

	app.get("/dashboard/matriz-produtos", {
		handler: buscarMatrizProdutos,
	});

	app.get("/dashboard/financeiro-saude", {
		handler: buscarFinanceiroSaude,
	});

	app.get("/dashboard/dre-avancado", {
		handler: buscarDreAvancado,
	});

	app.get("/dashboard/comparativo-flexivel", {
		handler: buscarComparativoFlexivel,
	});

	/* Analytics — completo */
	const requireCompleto = requireFeature(FEATURES_SAAS.DASHBOARD_COMPLETO);

	app.get("/dashboard/fluxo-caixa", {
		onRequest: [requireCompleto],
		handler: buscarFluxoCaixa,
	});

	app.get("/dashboard/rentabilidade", {
		onRequest: [requireCompleto],
		handler: buscarRentabilidade,
	});

	app.get("/dashboard/clientes", {
		onRequest: [requireCompleto],
		handler: buscarClientesAnalytics,
	});

	app.get("/dashboard/clientes-rfm", {
		onRequest: [requireCompleto],
		handler: buscarClientesRfm,
	});

	app.get("/dashboard/insights", {
		onRequest: [requireCompleto],
		handler: buscarInsights,
	});

	app.get("/dashboard/metas", {
		onRequest: [requireCompleto],
		handler: listarMetas,
	});

	app.get("/dashboard/metas-acompanhamento", {
		onRequest: [requireCompleto],
		handler: buscarMetasAcompanhamento,
	});

	app.post("/dashboard/metas", {
		onRequest: [requireCompleto],
		handler: criarMetaDashboard,
	});

	app.put("/dashboard/metas/:id", {
		onRequest: [requireCompleto],
		handler: atualizarMetaDashboard,
	});

	app.delete("/dashboard/metas/:id", {
		onRequest: [requireCompleto],
		handler: excluirMetaDashboard,
	});
}
