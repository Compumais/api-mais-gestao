import { api } from "@/lib/axios";

export interface Hierarquia {
	id: string;
	idempresa: string;
	codigo: string | null;
	nome: string | null;
}

export interface ListarHierarquiasResponse {
	data: Hierarquia[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const hierarquiasService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
	}): Promise<ListarHierarquiasResponse> {
		const { data } = await api.get<ListarHierarquiasResponse>("/hierarquias", {
			params,
		});
		return data;
	},
};
