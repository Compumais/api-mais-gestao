import { api } from "@/lib/axios";
import type { Paginacao } from "@/services/conta-mesa.service";

export interface LocalEstoque {
	id: string;
	idempresa: string;
	codigo: string | null;
	descricao: string | null;
	inativo: number | null;
	posse: string | null;
	tipo: number | null;
}

export interface ListarLocaisEstoqueResponse {
	data: LocalEstoque[];
	paginacao: Paginacao;
}

export const localEstoqueService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		descricao?: string;
		codigo?: string;
	}): Promise<ListarLocaisEstoqueResponse> {
		const { data } = await api.get<ListarLocaisEstoqueResponse>(
			"/locais-estoque",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<LocalEstoque> {
		const { data } = await api.get<LocalEstoque>(`/locais-estoque/${id}`);
		return data;
	},
};
