import { api } from "@/lib/axios";

export interface Budget {
	id: string;
	idempresa: string;
	idplanocontas: string;
	ano: number;
	periodicidade: string;
	mes: number | null;
	valor: string;
	currenttimemillis: number | null;
}

export interface BudgetComPlanoContas extends Budget {
	planocontascodigo: string | null;
	planocontasnome: string | null;
}

export interface ListarBudgetsResponse {
	data: BudgetComPlanoContas[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarBudgetData {
	idempresa: string;
	idplanocontas: string;
	ano: number;
	periodicidade: "M" | "A";
	mes?: number | null;
	valor: number;
}

export interface AtualizarBudgetData {
	idplanocontas?: string;
	ano?: number;
	periodicidade?: "M" | "A";
	mes?: number | null;
	valor?: number;
}

export interface BudgetAcompanhamentoItem {
	idplanocontas: string;
	planocontascodigo: string | null;
	planocontasnome: string | null;
	periodicidade: string;
	limite: number;
	realizado: number;
	saldo: number;
	percentual: number;
}

export interface AcompanhamentoBudgetResponse {
	ano: number;
	mes: number | null;
	data: BudgetAcompanhamentoItem[];
}

export const budgetsService = {
	async listar(params?: {
		idempresa: string;
		ano?: number;
		mes?: number;
		periodicidade?: "M" | "A";
		idplanocontas?: string;
		page?: number;
		limit?: number;
	}): Promise<ListarBudgetsResponse> {
		const { data } = await api.get<ListarBudgetsResponse>("/budgets", {
			params,
		});
		return data;
	},

	async buscar(id: string): Promise<Budget> {
		const { data } = await api.get<Budget>(`/budgets/${id}`);
		return data;
	},

	async criar(dados: CriarBudgetData): Promise<Budget> {
		const { data } = await api.post<Budget>("/budgets", dados);
		return data;
	},

	async atualizar(id: string, dados: AtualizarBudgetData): Promise<Budget> {
		const { data } = await api.put<Budget>(`/budgets/${id}`, dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/budgets/${id}`);
	},

	async acompanhamento(params: {
		idempresa: string;
		ano: number;
		mes?: number;
	}): Promise<AcompanhamentoBudgetResponse> {
		const { data } = await api.get<AcompanhamentoBudgetResponse>(
			"/budgets/acompanhamento",
			{ params },
		);
		return data;
	},
};
