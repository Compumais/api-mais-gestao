import { api } from "@/lib/axios";
import type {
	AtualizarLocalEstoqueForm,
	CriarLocalEstoqueForm,
} from "@/schemas/local-estoque.schema";
import type { Paginacao } from "@/services/conta-mesa.service";

export interface LocalEstoque {
	id: string;
	idempresa: string;
	codigo: string | null;
	descricao: string | null;
	inativo: number | null;
	padrao?: number | null;
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

	async criar(dados: CriarLocalEstoqueForm): Promise<LocalEstoque> {
		const { data } = await api.post<LocalEstoque>("/locais-estoque", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarLocalEstoqueForm,
	): Promise<LocalEstoque> {
		const { data } = await api.put<LocalEstoque>(
			`/locais-estoque/${id}`,
			dados,
		);
		return data;
	},

	async definirPadrao(id: string): Promise<LocalEstoque> {
		const { data } = await api.put<LocalEstoque>(`/locais-estoque/${id}`, {
			padrao: 1,
		});
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/locais-estoque/${id}`);
	},
};
