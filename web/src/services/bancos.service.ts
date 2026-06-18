import { api } from "@/lib/axios";

export interface Banco {
	id: string;
	idempresa: string;
	codigo: string;
	nome: string;
	currenttimemillis: number;
}

export interface ListarBancosResponse {
	data: Banco[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarBancoData {
	idempresa: string;
	codigo: string;
	nome: string;
}

export interface AtualizarBancoData {
	codigo?: string;
	nome?: string;
}

export const bancosService = {
	async listar(params?: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
		codigo?: string;
	}): Promise<ListarBancosResponse> {
		const { data } = await api.get<ListarBancosResponse>("/bancos", {
			params,
		});
		return data;
	},

	async buscar(id: string): Promise<Banco> {
		const { data } = await api.get<Banco>(`/bancos/${id}`);
		return data;
	},

	async criar(dados: CriarBancoData): Promise<Banco> {
		const { data } = await api.post<Banco>("/bancos", dados);
		return data;
	},

	async atualizar(id: string, dados: AtualizarBancoData): Promise<Banco> {
		const { data } = await api.put<Banco>(`/bancos/${id}`, dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/bancos/${id}`);
	},

	async buscarProximoCodigo(
		idempresa: string,
	): Promise<{ codigo: string }> {
		const { data } = await api.get<{ codigo: string }>(
			"/bancos/proximo-codigo",
			{ params: { idempresa } },
		);
		return data;
	},
};
