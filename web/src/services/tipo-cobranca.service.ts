import { api } from "@/lib/axios";

export type TipoCobranca = {
	id: string;
	idempresa: string;
	codigo: number;
	descricao: string;
	idtipodocumentofinanceiro: string;
};

export type ListarTiposCobrancaResponse = {
	data: TipoCobranca[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type CriarTipoCobrancaData = {
	idempresa: string;
	codigo: number;
	descricao: string;
	idtipodocumentofinanceiro: string;
};

export type AtualizarTipoCobrancaData = {
	codigo?: number;
	descricao?: string;
	idtipodocumentofinanceiro?: string;
};

export const tipoCobrancaService = {
	async listar(params: {
		idempresa: string;
		codigo?: string;
		descricao?: string;
		idtipodocumentofinanceiro?: string;
		ordenarPor?: string;
		ordem?: "asc" | "desc";
		page?: number;
		limit?: number;
	}): Promise<ListarTiposCobrancaResponse> {
		const { data } = await api.get<ListarTiposCobrancaResponse>(
			"/tipos-cobranca",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<TipoCobranca> {
		const { data } = await api.get<TipoCobranca>(`/tipos-cobranca/${id}`);
		return data;
	},

	async criar(dados: CriarTipoCobrancaData): Promise<TipoCobranca> {
		const { data } = await api.post<TipoCobranca>("/tipos-cobranca", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarTipoCobrancaData,
	): Promise<TipoCobranca> {
		const { data } = await api.put<TipoCobranca>(
			`/tipos-cobranca/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/tipos-cobranca/${id}`);
	},
};
