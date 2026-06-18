import { api } from "@/lib/axios";

export interface Hierarquia {
	id: string;
	idempresa: string;
	codigo: string | null;
	nome: string | null;
	ncm: string | null;
	classe: number | null;
	origem: number | null;
	comissao: string | null;
	enviamobile?: number | null;
	icone?: string | null;
}

export interface ListarHierarquiasResponse {
	data: Hierarquia[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CriarHierarquiaData {
	idempresa: string;
	codigo?: string | null;
	nome?: string | null;
	ncm?: string | null;
	classe?: number | null;
	origem?: number | null;
	comissao?: number | null;
	enviamobile?: number | null;
	icone?: string | null;
}

export interface AtualizarHierarquiaData {
	codigo?: string | null;
	nome?: string | null;
	ncm?: string | null;
	classe?: number | null;
	origem?: number | null;
	comissao?: number | null;
	enviamobile?: number | null;
	icone?: string | null;
}

export const hierarquiasService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		nome?: string;
	}): Promise<ListarHierarquiasResponse> {
		const { data } = await api.get<ListarHierarquiasResponse>("/hierarquias", {
			params,
		});
		return data;
	},

	async buscar(id: string): Promise<Hierarquia> {
		const { data } = await api.get<Hierarquia>(`/hierarquias/${id}`);
		return data;
	},

	async criar(dados: CriarHierarquiaData): Promise<Hierarquia> {
		const { data } = await api.post<Hierarquia>("/hierarquias", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarHierarquiaData,
	): Promise<Hierarquia> {
		const { data } = await api.put<Hierarquia>(`/hierarquias/${id}`, dados);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/hierarquias/${id}`);
	},
};
