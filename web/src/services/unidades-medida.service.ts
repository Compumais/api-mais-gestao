import { api } from "@/lib/axios";

export interface UnidadeMedida {
	id: string;
	idempresa: string;
	codigo: string | null;
	nome: string | null;
}

export interface ListarUnidadesMedidaResponse {
	data: UnidadeMedida[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const unidadesMedidaService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
	}): Promise<ListarUnidadesMedidaResponse> {
		const { data } = await api.get<ListarUnidadesMedidaResponse>(
			"/unidades-medida",
			{ params },
		);
		return data;
	},
};
