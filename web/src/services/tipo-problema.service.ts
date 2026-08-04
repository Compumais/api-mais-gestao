import { api } from "@/lib/axios";

export type TipoProblema = {
	id: string;
	idempresa: string;
	codigo: string | null;
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

export type CriarTipoProblemaData = {
	idempresa: string;
	codigo?: string | null;
	descricao?: string | null;
	inativo?: number | null;
};

export type AtualizarTipoProblemaData = {
	codigo?: string | null;
	descricao?: string | null;
	inativo?: number | null;
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

	async buscar(id: string): Promise<TipoProblema> {
		const { data } = await api.get<TipoProblema>(`/tipos-problema/${id}`);
		return data;
	},

	async criar(dados: CriarTipoProblemaData): Promise<TipoProblema> {
		const { data } = await api.post<TipoProblema>("/tipos-problema", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarTipoProblemaData,
	): Promise<TipoProblema> {
		const { data } = await api.put<TipoProblema>(
			`/tipos-problema/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/tipos-problema/${id}`);
	},
};
