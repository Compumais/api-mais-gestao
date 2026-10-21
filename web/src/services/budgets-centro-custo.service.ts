import { api } from "@/lib/axios";
import type { RegimeApropriacao } from "@/constants/centro-custo-constants";

export interface BudgetCentroCusto {
	id: string;
	idempresa: string;
	idcentrocusto: string;
	idplanocontas: string | null;
	ano: number;
	periodicidade: "M" | "A";
	mes: number | null;
	valor: string;
	currenttimemillis: number | null;
}

export interface BudgetCentroCustoAcompanhamentoItem {
	idcentrocusto: string;
	centrocustocodigo: string | null;
	centrocustonome: string;
	idplanocontas: string | null;
	planocontascodigo: string | null;
	planocontasnome: string | null;
	limite: number;
	realizado: number;
	saldo: number;
	excesso: number;
	percentualExecucao: number;
	variacaoAbsoluta: number;
	variacaoPercentual: number | null;
}

export interface AcompanhamentoBudgetCentroCustoResponse {
	ano: number;
	mes: number | null;
	regime: RegimeApropriacao;
	data: BudgetCentroCustoAcompanhamentoItem[];
}

export interface CriarBudgetCentroCustoData {
	idempresa: string;
	idcentrocusto: string;
	idplanocontas?: string | null;
	ano: number;
	periodicidade: "M" | "A";
	mes?: number | null;
	valor: number;
}

export interface AtualizarBudgetCentroCustoData {
	idempresa: string;
	valor?: number;
	periodicidade?: "M" | "A";
	mes?: number | null;
}

export const budgetsCentroCustoService = {
	async criar(dados: CriarBudgetCentroCustoData): Promise<BudgetCentroCusto> {
		const { data } = await api.post<BudgetCentroCusto>(
			"/budgets-centro-custo",
			dados,
		);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarBudgetCentroCustoData,
	): Promise<BudgetCentroCusto> {
		const { data } = await api.put<BudgetCentroCusto>(
			`/budgets-centro-custo/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/budgets-centro-custo/${id}`);
	},

	async acompanhamento(params: {
		idempresa: string;
		ano: number;
		mes?: number;
		regime?: RegimeApropriacao;
	}): Promise<AcompanhamentoBudgetCentroCustoResponse> {
		const { data } = await api.get<AcompanhamentoBudgetCentroCustoResponse>(
			"/budgets-centro-custo/acompanhamento",
			{ params },
		);
		return data;
	},
};
