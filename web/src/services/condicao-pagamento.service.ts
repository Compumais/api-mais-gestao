import { api } from "@/lib/axios";

export interface CondicaoPagamento {
	id: string;
	idempresa: string;
	codigo: string | null;
	descricao: string | null;
	parcelas: number | null;
	prazos: string | null;
	escopo: number | null;
	inativo: number | null;
	tipo: number | null;
}

export interface ListarCondicoesPagamentoResponse {
	data: CondicaoPagamento[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarCondicaoPagamentoData {
	idempresa: string;
	codigo?: string | null;
	descricao?: string | null;
	parcelas?: number | null;
	prazos?: string | null;
	escopo?: number | null;
	inativo?: number | null;
}

export interface AtualizarCondicaoPagamentoData {
	codigo?: string | null;
	descricao?: string | null;
	parcelas?: number | null;
	prazos?: string | null;
	escopo?: number | null;
	inativo?: number | null;
}

export const condicaoPagamentoService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		descricao?: string;
		inativo?: number;
	}): Promise<ListarCondicoesPagamentoResponse> {
		const { data } = await api.get<ListarCondicoesPagamentoResponse>(
			"/condicoes-pagamento",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<CondicaoPagamento> {
		const { data } = await api.get<CondicaoPagamento>(
			`/condicoes-pagamento/${id}`,
		);
		return data;
	},

	async criar(dados: CriarCondicaoPagamentoData): Promise<CondicaoPagamento> {
		const { data } = await api.post<CondicaoPagamento>(
			"/condicoes-pagamento",
			dados,
		);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarCondicaoPagamentoData,
	): Promise<CondicaoPagamento> {
		const { data } = await api.put<CondicaoPagamento>(
			`/condicoes-pagamento/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/condicoes-pagamento/${id}`);
	},

	async buscarProximoCodigo(
		idempresa: string,
	): Promise<{ codigo: string }> {
		const { data } = await api.get<{ codigo: string }>(
			"/condicoes-pagamento/proximo-codigo",
			{ params: { idempresa } },
		);
		return data;
	},
};
