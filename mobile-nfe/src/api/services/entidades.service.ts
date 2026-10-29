import { api } from "@/src/api/client";

export interface Entidade {
	id: string;
	idempresa: string;
	nome: string;
	razaosocial: string | null;
	cnpjcpf: string;
	email: string | null;
	telefone: string | null;
	endereco: string | null;
	cliente: number | null;
	indiedest: number | null;
}

export interface ListarEntidadesResponse {
	data: Entidade[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const entidadesService = {
	async listar(params: {
		idempresa: string;
		cliente?: number;
		page?: number;
		limit?: number;
		q?: string;
	}) {
		const { data } = await api.get<ListarEntidadesResponse>("/entidades", {
			params,
		});
		return data;
	},

	async buscar(id: string) {
		const { data } = await api.get<Entidade>(`/entidades/${id}`);
		return data;
	},

	async criar(body: Record<string, unknown>) {
		const { data } = await api.post<Entidade>("/entidades", body);
		return data;
	},

	async atualizar(id: string, body: Record<string, unknown>) {
		const { data } = await api.put<Entidade>(`/entidades/${id}`, body);
		return data;
	},
};
