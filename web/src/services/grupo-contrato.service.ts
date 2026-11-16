import { api } from "@/lib/axios";

export type GrupoContrato = {
	id: string;
	idempresa: string;
	codigo: number;
	descricao: string;
};

export type ListarGruposContratoResponse = {
	data: GrupoContrato[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export const grupoContratoService = {
	async listar(params: {
		idempresa: string;
		codigo?: string;
		descricao?: string;
		ordenarPor?: string;
		ordem?: "asc" | "desc";
		page?: number;
		limit?: number;
	}): Promise<ListarGruposContratoResponse> {
		const { data } = await api.get<ListarGruposContratoResponse>(
			"/grupos-contrato",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<GrupoContrato> {
		const { data } = await api.get<GrupoContrato>(`/grupos-contrato/${id}`);
		return data;
	},

	async criar(dados: {
		idempresa: string;
		codigo: number;
		descricao: string;
	}): Promise<GrupoContrato> {
		const { data } = await api.post<GrupoContrato>("/grupos-contrato", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: { codigo?: number; descricao?: string },
	): Promise<GrupoContrato> {
		const { data } = await api.put<GrupoContrato>(
			`/grupos-contrato/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/grupos-contrato/${id}`);
	},

	async listarTodos(params: { idempresa: string }): Promise<GrupoContrato[]> {
		const limite = 100;
		let page = 1;
		let totalPages = 1;
		const itens: GrupoContrato[] = [];

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
			"/grupos-contrato/proximo-codigo",
			{ params: { idempresa } },
		);
		return data;
	},
};
