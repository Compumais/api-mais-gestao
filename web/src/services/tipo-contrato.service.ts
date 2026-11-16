import { api } from "@/lib/axios";

export type TipoContrato = {
	id: string;
	idempresa: string;
	idgrupocontrato: string | null;
	codigo: number;
	descricao: string;
	valor: string;
};

export type ListarTiposContratoResponse = {
	data: TipoContrato[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export type CriarTipoContratoData = {
	idempresa: string;
	idgrupocontrato?: string | null;
	codigo: number;
	descricao: string;
	valor: number | string;
};

export type AtualizarTipoContratoData = {
	idgrupocontrato?: string | null;
	codigo?: number;
	descricao?: string;
	valor?: number | string;
};

export const tipoContratoService = {
	async listar(params: {
		idempresa: string;
		codigo?: string;
		descricao?: string;
		ordenarPor?: string;
		ordem?: "asc" | "desc";
		page?: number;
		limit?: number;
	}): Promise<ListarTiposContratoResponse> {
		const { data } = await api.get<ListarTiposContratoResponse>(
			"/tipos-contrato",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<TipoContrato> {
		const { data } = await api.get<TipoContrato>(`/tipos-contrato/${id}`);
		return data;
	},

	async criar(dados: CriarTipoContratoData): Promise<TipoContrato> {
		const { data } = await api.post<TipoContrato>("/tipos-contrato", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarTipoContratoData,
	): Promise<TipoContrato> {
		const { data } = await api.put<TipoContrato>(`/tipos-contrato/${id}`, dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/tipos-contrato/${id}`);
	},

	async listarTodos(params: { idempresa: string }): Promise<TipoContrato[]> {
		const limite = 100;
		let page = 1;
		let totalPages = 1;
		const itens: TipoContrato[] = [];

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

	async buscarProximoCodigo(idempresa: string): Promise<{ codigo: number }> {
		const { data } = await api.get<{ codigo: number }>(
			"/tipos-contrato/proximo-codigo",
			{ params: { idempresa } },
		);
		return data;
	},
};
