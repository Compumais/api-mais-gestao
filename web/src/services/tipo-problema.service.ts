import { api } from "@/lib/axios";

export type TipoProblema = {
	id: string;
	idempresa: string;
	descricao: string | null;
	inativo: number | null;
};

export type ListarTiposProblemaResponse = {
	data: TipoProblema[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export const tipoProblemaService = {
	async listar(params: {
		idempresa: string;
		descricao?: string;
		inativo?: number;
		page?: number;
		limit?: number;
	}): Promise<ListarTiposProblemaResponse> {
		const { data } = await api.get<ListarTiposProblemaResponse>(
			"/tipos-problema",
			{ params },
		);
		return data;
	},

	async listarTodos(params: {
		idempresa: string;
		descricao?: string;
		inativo?: number;
	}): Promise<TipoProblema[]> {
		const limite = 100;
		let page = 1;
		let totalPages = 1;
		const itens: TipoProblema[] = [];

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
