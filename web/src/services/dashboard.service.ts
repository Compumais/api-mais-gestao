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
};

