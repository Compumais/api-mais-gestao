import { api } from "@/lib/axios";

export interface DashboardData {
	totalContasPagar: string;
	totalContasReceber: string;
	saldoBancario: string;
	saldoCaixa: string;
	quantidadeUsuarios: number;
}

export interface BuscarDadosDashboardParams {
	idempresa?: string;
}

export interface HistoricoFinanceiroItem {
	date: string;
	contasPagar: number;
	contasReceber: number;
}

export interface BuscarHistoricoFinanceiroParams {
	idempresa?: string;
	dias?: number;
}

export const dashboardService = {
	async buscarDados(
		params?: BuscarDadosDashboardParams,
	): Promise<DashboardData> {
		const { data } = await api.get<DashboardData>("/dashboard", {
			params,
		});
		return data;
	},

	async buscarHistorico(
		params?: BuscarHistoricoFinanceiroParams,
	): Promise<HistoricoFinanceiroItem[]> {
		const { data } = await api.get<HistoricoFinanceiroItem[]>(
			"/dashboard/historico",
			{
				params,
			},
		);
		return data;
	},

	async buscarUltimasMovimentacoes(
		params?: BuscarDadosDashboardParams,
	): Promise<UltimasMovimentacoes> {
		const { data } = await api.get<UltimasMovimentacoes>(
			"/dashboard/ultimas-movimentacoes",
			{
				params,
			},
		);
		return data;
	},

	async buscarTopDespesasPorCategoria(
		params?: BuscarTopPorCategoriaParams,
	): Promise<TopPorCategoriaResposta> {
		const { data } = await api.get<TopPorCategoriaResposta>(
			"/dashboard/top-despesas-categoria",
			{ params },
		);
		return data;
	},

	async buscarTopReceitasPorCategoria(
		params?: BuscarTopPorCategoriaParams,
	): Promise<TopPorCategoriaResposta> {
		const { data } = await api.get<TopPorCategoriaResposta>(
			"/dashboard/top-receitas-categoria",
			{ params },
		);
		return data;
	},

	async buscarFinanceiroResumo(
		params?: BuscarComDiasParams,
	): Promise<FinanceiroResumo> {
		const { data } = await api.get<FinanceiroResumo>(
			"/dashboard/financeiro-resumo",
			{ params },
		);
		return data;
	},

	async buscarEvolucaoMensal(
		params?: BuscarComDiasParams & BuscarComAnoParams,
	): Promise<EvolucaoMensalItem[]> {
		const { data } = await api.get<EvolucaoMensalItem[]>(
			"/dashboard/evolucao-mensal",
			{ params },
		);
		return data;
	},

	async buscarTopDespesasValor(
		params?: BuscarComDiasParams,
	): Promise<TopDespesaItem[]> {
		const { data } = await api.get<TopDespesaItem[]>(
			"/dashboard/top-despesas-valor",
			{ params },
		);
		return data;
	},

	async buscarDadosVendas(
		params?: BuscarComDiasParams,
	): Promise<DadosVendasResumo> {
		const { data } = await api.get<DadosVendasResumo>("/dashboard/vendas", {
			params,
		});
		return data;
	},

	async buscarHistoricoVendas(
		params?: BuscarComDiasParams,
	): Promise<HistoricoVendasItem[]> {
		const { data } = await api.get<HistoricoVendasItem[]>(
			"/dashboard/vendas-historico",
			{ params },
		);
		return data;
	},

	async buscarTopProdutos(
		params?: BuscarComDiasParams,
	): Promise<TopProdutoItem[]> {
		const { data } = await api.get<TopProdutoItem[]>(
			"/dashboard/top-produtos",
			{ params },
		);
		return data;
	},

	async buscarUltimosFechamentos(params?: {
		idempresa?: string;
		limit?: number;
	}): Promise<FechamentoCaixaItem[]> {
		const { data } = await api.get<FechamentoCaixaItem[]>(
			"/dashboard/ultimos-fechamentos",
			{ params },
		);
		return data;
	},

	async buscarControlePlanoContas(
		params?: BuscarComAnoParams,
	): Promise<ControlePlanoContasResposta> {
		const { data } = await api.get<ControlePlanoContasResposta>(
			"/dashboard/controle-plano-contas",
			{ params },
		);
		return data;
	},

	async buscarDre(params?: BuscarComAnoParams): Promise<DreResposta> {
		const { data } = await api.get<DreResposta>("/dashboard/dre", { params });
		return data;
	},

	async buscarComparativo(
		params?: BuscarComAnoParams,
	): Promise<ComparativoResposta> {
		const { data } = await api.get<ComparativoResposta>(
			"/dashboard/comparativo",
			{ params },
		);
		return data;
	},
};

export interface UltimaMovimentacao {
	id: string;
	descricao: string;
	valor: string;
	data: string;
	status: string;
	usuario: string;
	tipo: "P" | "R" | "B";
	natureza: "entrada" | "saida";
}

export interface UltimasMovimentacoes {
	pagar: UltimaMovimentacao[];
	receber: UltimaMovimentacao[];
	bancarias: UltimaMovimentacao[];
}

export interface TopPorCategoriaItem {
	idplanocontas: string;
	codigo: string | null;
	nome: string | null;
	total: number;
}

export interface TopPorCategoriaResposta {
	itens: TopPorCategoriaItem[];
	total: number;
}

export interface BuscarTopPorCategoriaParams {
	idempresa?: string;
	dias?: number;
}

export interface FinanceiroResumo {
	totalReceitas: number;
	totalDespesas: number;
	saldo: number;
	totalLancamentos: number;
}

export interface EvolucaoMensalItem {
	mes: number;
	receitas: number;
	despesas: number;
	saldo: number;
}

export interface TopDespesaItem {
	id: string;
	descricao: string;
	valor: number;
	data: string;
	planoContas: string | null;
}

export interface DadosVendasResumo {
	totalVendas: number;
	quantidadeVendas: number;
	quantidadeFechamentos: number;
	diferencaFechamentos: number;
}

export interface HistoricoVendasItem {
	date: string;
	total: number;
	quantidade: number;
}

export interface TopProdutoItem {
	idproduto: string;
	nome: string;
	quantidade: number;
	total: number;
}

export interface FechamentoCaixaItem {
	id: number;
	datahora: string | null;
	pdv: number | null;
	saldoinformado: string | null;
	saldoapurado: string | null;
	sobra: string | null;
	falta: string | null;
	diferenca: number;
}

export interface PlanoContasMensalItem {
	idplanocontas: string;
	codigo: string | null;
	nome: string | null;
	tipoconta: number | null;
	meses: number[];
	total: number;
}

export interface ControlePlanoContasResposta {
	ano: number;
	linhas: PlanoContasMensalItem[];
	saldoLiquidoMensal: number[];
}

export interface DreLinhaItem {
	id: string;
	nome: string;
	tipo: "receita" | "despesa" | "resultado";
	nivel: number;
	meses: number[];
	total: number;
}

export interface DreResposta {
	ano: number;
	linhas: DreLinhaItem[];
}

export interface ComparativoMensalItem {
	mes: number;
	receitaAnoAnterior: number;
	despesaAnoAnterior: number;
	receitaAnoAtual: number;
	despesaAnoAtual: number;
	saldoAnoAnterior: number;
	saldoAnoAtual: number;
	saldoAcumuladoAnoAnterior: number;
	saldoAcumuladoAnoAtual: number;
	variacaoReceitaPercentual: number;
}

export interface ComparativoResposta {
	anoAtual: number;
	anoAnterior: number;
	totais: {
		receitaAnoAnterior: number;
		despesaAnoAnterior: number;
		receitaAnoAtual: number;
		despesaAnoAtual: number;
	};
	meses: ComparativoMensalItem[];
}

export interface BuscarComAnoParams {
	idempresa?: string;
	ano?: number;
}

export interface BuscarComDiasParams {
	idempresa?: string;
	dias?: number;
}
