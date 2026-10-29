import { api } from "@/src/api/client";

export interface DashboardData {
	totalContasPagar: string;
	totalContasReceber: string;
	saldoBancario: string;
	saldoCaixa: string;
	quantidadeUsuarios: number;
}

export type ExecutivoDashboard = {
	faturamento: { valor: number; variacaoPeriodoAnteriorPct: number | null };
	lucroLiquido: { valor: number; margemLiquidaPct: number | null };
	caixa: { saldoAtual: number; saldoProjetado: number };
	vendas: {
		quantidade: number;
		ticketMedio: number;
		clientesAtendidos: number;
	};
};

export const dashboardService = {
	async buscarResumo(idempresa: string) {
		const { data } = await api.get<DashboardData>("/dashboard", {
			params: { idempresa },
		});
		return data;
	},

	async buscarExecutivo(idempresa: string, preset = "mes_atual") {
		const { data } = await api.get<ExecutivoDashboard>("/dashboard/executivo", {
			params: { idempresa, preset },
		});
		return data;
	},
};
