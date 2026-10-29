import { api } from "@/lib/axios";

export interface MetodoPagamentoBaixa {
	valor: string | number;
	metodo?: string | null;
	conta?: string | null;
	observacao?: string | null;
}

export interface FinanceiroLancamento {
	id: string;
	idfinanceiro: string;
	valoranterior: string | null;
	desconto: string | null;
	valor: string | null;
	pagamento: string | null;
	baixa: string | null;
	juros: string | null;
	multa: string | null;
	usuario: string | null;
	cancelado: number | null;
	datahoracancelado: string | null;
	evento: number;
	historico: string | null;
	reabertura: string | null;
	observacao: string | null;
	valorbaixa: string | null;
	currenttimemillis: number | null;
}

export interface CriarFinanceiroLancamentoData {
	idfinanceiro: string;
	valor?: string;
	valorbaixa?: string;
	pagamento?: string;
	baixa?: string;
	juros?: string;
	multa?: string;
	desconto?: string;
	historico?: string;
	observacao?: string;
	evento?: number;
	pagamentos?: MetodoPagamentoBaixa[];
}

export interface ListarFinanceiroLancamentosResponse {
	data: FinanceiroLancamento[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const financeiroLancamentoService = {
	async criar(
		dados: CriarFinanceiroLancamentoData,
	): Promise<FinanceiroLancamento> {
		const { data } = await api.post<FinanceiroLancamento>(
			"/financeiro-lancamentos",
			dados,
		);
		return data;
	},

	async listar(params: {
		idfinanceiro: string;
		page?: number;
		limit?: number;
	}): Promise<ListarFinanceiroLancamentosResponse> {
		const { data } = await api.get<ListarFinanceiroLancamentosResponse>(
			"/financeiro-lancamentos",
			{ params },
		);
		return data;
	},

	async estornar(id: string): Promise<FinanceiroLancamento> {
		const { data } = await api.post<FinanceiroLancamento>(
			`/financeiro-lancamentos/${id}/estornar`,
		);
		return data;
	},
};
