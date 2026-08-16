import { api } from "@/lib/axios";

export interface GrupoGourmet {
	id: string;
	idempresa: string;
	codigo: string | null;
	nome: string;
	inativo: number;
}

export interface ListarGruposGourmetResponse {
	data: GrupoGourmet[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarGrupoGourmetData {
	idempresa: string;
	codigo?: string | null;
	nome: string;
	inativo?: number;
}

export interface AtualizarGrupoGourmetData {
	codigo?: string | null;
	nome?: string;
	inativo?: number;
}

export const gruposGourmetService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
		q?: string;
	}): Promise<ListarGruposGourmetResponse> {
		const { data } = await api.get<ListarGruposGourmetResponse>(
			"/grupos-gourmet",
			{ params },
		);
		return data;
	},

	async listarTodos(params: { idempresa: string }): Promise<GrupoGourmet[]> {
		const limite = 100;
		let pagina = 1;
		const registros: GrupoGourmet[] = [];

		while (true) {
			const resposta = await gruposGourmetService.listar({
				...params,
				page: pagina,
				limit: limite,
			});
			registros.push(...resposta.data);
			if (pagina >= resposta.paginacao.totalPages) {
				break;
			}
			pagina += 1;
		}

		return registros;
	},

	async buscar(id: string): Promise<GrupoGourmet> {
		const { data } = await api.get<GrupoGourmet>(`/grupos-gourmet/${id}`);
		return data;
	},

	async criar(dados: CriarGrupoGourmetData): Promise<GrupoGourmet> {
		const { data } = await api.post<GrupoGourmet>("/grupos-gourmet", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarGrupoGourmetData,
	): Promise<GrupoGourmet> {
		const { data } = await api.put<GrupoGourmet>(`/grupos-gourmet/${id}`, dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/grupos-gourmet/${id}`);
	},
};
