import { api } from "@/lib/axios";

export type Area = {
	id: string;
	idempresa: string;
	descricao: string | null;
	inativo: number | null;
};

export type ListarAreasResponse = {
	data: Area[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export const areaService = {
	async listar(params: {
		idempresa: string;
		descricao?: string;
		inativo?: number;
		page?: number;
		limit?: number;
	}): Promise<ListarAreasResponse> {
		const { data } = await api.get<ListarAreasResponse>("/areas", { params });
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		descricao?: string;
		inativo?: number;
	}): Promise<Area[]> {
		const limite = 100;
		let page = 1;
		let totalPages = 1;
		const itens: Area[] = [];

		while (page <= totalPages) {
			const resposta = await this.listar({
				...params,
				page,
				limit: limite,
			});
			itens.push(...resposta.data);
			totalPages = resposta.paginacao.totalPages;
			page += 1;
		}

		return itens;
	},
};
