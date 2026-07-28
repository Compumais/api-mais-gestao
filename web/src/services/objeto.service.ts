import { api } from "@/lib/axios";

export type Objeto = {
	id: string;
	idempresa: string;
	descricao: string | null;
	inativo: number | null;
};

export type ListarObjetosResponse = {
	data: Objeto[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export const objetoService = {
	async listar(params: {
		idempresa: string;
		descricao?: string;
		inativo?: number;
		page?: number;
		limit?: number;
	}): Promise<ListarObjetosResponse> {
		const { data } = await api.get<ListarObjetosResponse>("/objetos", {
			params,
		});
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		descricao?: string;
		inativo?: number;
	}): Promise<Objeto[]> {
		const limite = 100;
		let page = 1;
		let totalPages = 1;
		const itens: Objeto[] = [];

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
