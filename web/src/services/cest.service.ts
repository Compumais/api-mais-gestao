import { api } from "@/lib/axios";

export interface Cest {
	id: string;
	idempresa: string | null;
	codigo: string;
	descricao: string;
	descricaoncm: string;
	inativo: number | null;
}

export interface ListarCestsResponse {
	data: Cest[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const cestService = {
	async buscar(id: string): Promise<Cest> {
		const { data } = await api.get<Cest>(`/cests/${id}`);
		return data;
	},

	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		descricao?: string;
		inativo?: number;
	}): Promise<ListarCestsResponse> {
		const { data } = await api.get<ListarCestsResponse>("/cests", { params });
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		descricao?: string;
	}): Promise<Cest[]> {
		const limite = 100;
		let pagina = 1;
		const registros: Cest[] = [];

		while (true) {
			const resposta = await cestService.listar({
				...params,
				page: pagina,
				limit: limite,
				inativo: 0,
			});

			registros.push(...(resposta.data ?? []));

			if (
				!resposta.paginacao?.totalPages ||
				pagina >= resposta.paginacao.totalPages
			) {
				break;
			}

			pagina += 1;
		}

		return registros;
	},
};
