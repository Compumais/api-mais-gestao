import { api } from "@/lib/axios";

export interface ServicoNfse {
	id: string;
	codigo: string;
	descricao: string;
	restrito: string | null;
	codigotributacao: string | null;
	codigoextra: string | null;
	inativo: number;
}

export interface ListarServicosNfseResponse {
	data: ServicoNfse[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const servicosNfseService = {
	async listar(params?: {
		q?: string;
		page?: number;
		limit?: number;
	}): Promise<ListarServicosNfseResponse> {
		const { data } = await api.get<ListarServicosNfseResponse>(
			"/servicos-nfse",
			{ params },
		);
		return data;
	},

	async listarTodos(q?: string): Promise<ServicoNfse[]> {
		const limite = 100;
		const primeiraPagina = await servicosNfseService.listar({
			q,
			page: 1,
			limit: limite,
		});

		const todos = [...primeiraPagina.data];
		const { totalPages } = primeiraPagina.paginacao;

		for (let page = 2; page <= totalPages; page += 1) {
			const pagina = await servicosNfseService.listar({
				q,
				page,
				limit: limite,
			});
			todos.push(...pagina.data);
		}

		return todos;
	},
};
