import { api } from "@/lib/axios";
import type { PeriodoPreset } from "@/lib/dashboard-periodo";

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

export type BuscarPeriodoParams = {
	idempresa?: string;
	preset?: PeriodoPreset;
	dataInicio?: string;
	dataFim?: string;
	dias?: number;
};

export type KpiComVariacao = {
	valor: number;
	variacaoPeriodoAnteriorPct: number | null;
	variacaoYoYPct: number | null;
};

export type ExecutivoDashboard = {
	faturamento: KpiComVariacao;
	lucroBruto: KpiComVariacao & { margemBrutaPct: number | null };
	lucroLiquido: KpiComVariacao & { margemLiquidaPct: number | null };
	caixa: {
		saldoAtual: number;
		entradasPrevistas: number;
		saidasPrevistas: number;
		saldoProjetado: number;
	};
	vendas: {
		quantidade: number;
		ticketMedio: number;
		itensVendidos: number;
		clientesAtendidos: number;
	};
	financeiro: {
		contasReceberAberto: number;
		contasPagarAberto: number;
		valorVencido: number;
		resultadoOperacional: number;
	};
	evolucaoFaturamento: { date: string; total: number; quantidade: number }[];
	receitasDespesas: { receitas: number; despesas: number };
	topProdutos: {
		idproduto: string;
		nome: string;
		total: number;
		quantidade: number;
	}[];
	topClientes: {
		identidade: string;
		nome: string;
		total: number;
		quantidade: number;
	}[];
};

export type VendasAvancadas = {
	faturamento: number;
	quantidadeVendas: number;
	ticketMedio: number;
	itensVendidos: number;
	clientesAtendidos: number;
	clientesNovos: number;
	clientesRecorrentes: number;
	ticketMedioNovos: number;
	ticketMedioRecorrentes: number;
	variacaoFaturamentoPct: number | null;
};

export type VendaPorHoraItem = {
	hora: number;
	total: number;
	quantidade: number;
};

export type VendaPorDiaSemanaItem = {
	diaSemana: number;
	total: number;
	quantidade: number;
};

export type RankingOrdenacao = "faturamento" | "quantidade" | "lucro" | "margem";

export type TopProdutoAvancado = {
	idproduto: string;
	nome: string;
	quantidade: number;
	faturamento: number;
	custo: number;
	lucro: number;
	margemPct: number | null;
};

export type MatrizProdutoItem = {
	idproduto: string;
	nome: string;
	vendas: number;
	faturamento: number;
	custo: number;
	lucro: number;
	margemPct: number | null;
};

export type AgingBucket = {
	faixa: string;
	quantidade: number;
	valor: number;
};

export type FinanceiroSaude = {
	receitas: number;
	despesas: number;
	resultado: number;
	saldoAtual: number;
	contasReceberAberto: number;
	contasPagarAberto: number;
	valorVencidoReceber: number;
	valorVencidoPagar: number;
	taxaInadimplenciaPct: number | null;
	agingReceber: AgingBucket[];
	agingPagar: AgingBucket[];
	topInadimplentes: {
		identidade: string | null;
		nome: string;
		valor: number;
		diasAtraso: number;
	}[];
};

export type FluxoCaixaResposta = {
	modo: "historico" | "projetado";
	saldoInicial: number;
	dias: { date: string; entradas: number; saidas: number; saldo: number }[];
};

export type DreAvancadoResposta = {
	granularidade: "ano" | "trimestre" | "mes";
	referencia: string;
	receitaTotal: number;
	linhas: {
		id: string;
		nome: string;
		tipo: "receita" | "despesa" | "resultado";
		nivel: number;
		valor: number;
		percentualReceita: number | null;
	}[];
};

export type ComparativoFlexivelModo =
	| "ano_x_ano"
	| "mes_x_anterior"
	| "mes_x_yoy"
	| "personalizado";

export type ComparativoFlexivelResposta = {
	modo: ComparativoFlexivelModo;
	metricas: {
		faturamento: {
			label: string;
			periodoA: number;
			periodoB: number;
			variacaoPct: number | null;
		};
		receitas: {
			label: string;
			periodoA: number;
			periodoB: number;
			variacaoPct: number | null;
		};
		despesas: {
			label: string;
			periodoA: number;
			periodoB: number;
			variacaoPct: number | null;
		};
		resultado: {
			label: string;
			periodoA: number;
			periodoB: number;
			variacaoPct: number | null;
		};
	};
};

export type RentabilidadeResposta = {
	dimensao: "produto" | "categoria";
	medianaVolume: number;
	medianaMargem: number;
	itens: {
		id: string;
		nome: string;
		quantidade: number;
		faturamento: number;
		custo: number;
		lucro: number;
		margemPct: number | null;
		quadrante: "estrela" | "negociar" | "oportunidade" | "revisar";
	}[];
};

export type ClientesAnalytics = {
	clientesAtendidos: number;
	clientesNovos: number;
	clientesRecorrentes: number;
	ticketMedio: number;
	faturamento: number;
	topClientes: {
		identidade: string;
		nome: string;
		total: number;
		quantidade: number;
	}[];
	novos: {
		identidade: string;
		nome: string;
		total: number;
		quantidade: number;
	}[];
	recorrentes: {
		identidade: string;
		nome: string;
		total: number;
		quantidade: number;
	}[];
};

export type ClientesRfmResposta = {
	segmentos: Record<"vip" | "fieis" | "risco" | "inativos" | "novos", number>;
	clientes: {
		identidade: string;
		nome: string;
		recenciaDias: number;
		frequencia: number;
		monetario: number;
		segmento: "vip" | "fieis" | "risco" | "inativos" | "novos";
	}[];
};

export type InsightItem = {
	severidade: "positivo" | "atencao" | "critico";
	mensagem: string;
	tabAlvo: string;
	codigo: string;
};

export type TipoMetaDashboard =
	| "faturamento"
	| "vendas"
	| "lucro"
	| "margem"
	| "despesas";

export type MetaDashboard = {
	id: string;
	idempresa: string;
	tipo: TipoMetaDashboard;
	periodoInicio: string;
	periodoFim: string;
	valorMeta: string;
	criadoem: string;
	atualizadoem: string;
};

export type MetaAcompanhamento = MetaDashboard & {
	valorRealizado: number;
	percentualAtingido: number | null;
	diferenca: number;
};

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

	/* Analytics redesign */
	async buscarExecutivo(params?: BuscarPeriodoParams) {
		const { data } = await api.get<ExecutivoDashboard>("/dashboard/executivo", {
			params,
		});
		return data;
	},

	async buscarVendasAvancadas(params?: BuscarPeriodoParams) {
		const { data } = await api.get<VendasAvancadas>(
			"/dashboard/vendas-avancadas",
			{ params },
		);
		return data;
	},

	async buscarVendasPorHora(params?: BuscarPeriodoParams) {
		const { data } = await api.get<VendaPorHoraItem[]>(
			"/dashboard/vendas-por-hora",
			{ params },
		);
		return data;
	},

	async buscarVendasPorDiaSemana(params?: BuscarPeriodoParams) {
		const { data } = await api.get<VendaPorDiaSemanaItem[]>(
			"/dashboard/vendas-por-dia-semana",
			{ params },
		);
		return data;
	},

	async buscarTopProdutosAvancado(
		params?: BuscarPeriodoParams & { ordenacao?: RankingOrdenacao; limit?: number },
	) {
		const { data } = await api.get<TopProdutoAvancado[]>(
			"/dashboard/top-produtos-avancado",
			{ params },
		);
		return data;
	},

	async buscarMatrizProdutos(params?: BuscarPeriodoParams) {
		const { data } = await api.get<MatrizProdutoItem[]>(
			"/dashboard/matriz-produtos",
			{ params },
		);
		return data;
	},

	async buscarFinanceiroSaude(params?: BuscarPeriodoParams) {
		const { data } = await api.get<FinanceiroSaude>(
			"/dashboard/financeiro-saude",
			{ params },
		);
		return data;
	},

	async buscarFluxoCaixa(
		params?: BuscarPeriodoParams & {
			modo?: "historico" | "projetado";
			horizonteDias?: number;
		},
	) {
		const { data } = await api.get<FluxoCaixaResposta>("/dashboard/fluxo-caixa", {
			params,
		});
		return data;
	},

	async buscarDreAvancado(
		params?: {
			idempresa?: string;
			granularidade?: "ano" | "trimestre" | "mes";
			ano?: number;
			mes?: number;
			trimestre?: number;
		},
	) {
		const { data } = await api.get<DreAvancadoResposta>(
			"/dashboard/dre-avancado",
			{ params },
		);
		return data;
	},

	async buscarComparativoFlexivel(
		params?: BuscarPeriodoParams & { modo?: ComparativoFlexivelModo },
	) {
		const { data } = await api.get<ComparativoFlexivelResposta>(
			"/dashboard/comparativo-flexivel",
			{ params },
		);
		return data;
	},

	async buscarRentabilidade(
		params?: BuscarPeriodoParams & { dimensao?: "produto" | "categoria" },
	) {
		const { data } = await api.get<RentabilidadeResposta>(
			"/dashboard/rentabilidade",
			{ params },
		);
		return data;
	},

	async buscarClientesAnalytics(params?: BuscarPeriodoParams) {
		const { data } = await api.get<ClientesAnalytics>("/dashboard/clientes", {
			params,
		});
		return data;
	},

	async buscarClientesRfm(params?: BuscarPeriodoParams) {
		const { data } = await api.get<ClientesRfmResposta>(
			"/dashboard/clientes-rfm",
			{ params },
		);
		return data;
	},

	async buscarInsights(params?: BuscarPeriodoParams) {
		const { data } = await api.get<InsightItem[]>("/dashboard/insights", {
			params,
		});
		return data;
	},

	async listarMetas(params?: { idempresa?: string }) {
		const { data } = await api.get<MetaDashboard[]>("/dashboard/metas", {
			params,
		});
		return data;
	},

	async buscarMetasAcompanhamento(params?: { idempresa?: string }) {
		const { data } = await api.get<MetaAcompanhamento[]>(
			"/dashboard/metas-acompanhamento",
			{ params },
		);
		return data;
	},

	async criarMeta(body: {
		idempresa: string;
		tipo: TipoMetaDashboard;
		periodoInicio: string;
		periodoFim: string;
		valorMeta: string | number;
	}) {
		const { data } = await api.post<MetaDashboard>("/dashboard/metas", body);
		return data;
	},

	async atualizarMeta(
		id: string,
		body: {
			idempresa?: string;
			tipo?: TipoMetaDashboard;
			periodoInicio?: string;
			periodoFim?: string;
			valorMeta?: string | number;
		},
	) {
		const { data } = await api.put<MetaDashboard>(`/dashboard/metas/${id}`, body);
		return data;
	},

	async excluirMeta(id: string, params?: { idempresa?: string }) {
		await api.delete(`/dashboard/metas/${id}`, { params });
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
