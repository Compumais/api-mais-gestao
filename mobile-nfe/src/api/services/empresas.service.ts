import { api } from "@/src/api/client";

export interface Empresa {
	id: string;
	idproprietario: string;
	nome: string;
	cnpj?: string | null;
}

interface ListarEmpresasResponse {
	data: Empresa[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export const empresasService = {
	async listar(params?: { page?: number; limit?: number }) {
		const { data } = await api.get<ListarEmpresasResponse>("/empresas", {
			params: { limit: 100, ...params },
		});
		return data;
	},

	async buscar(id: string) {
		const { data } = await api.get<Empresa>(`/empresas/${id}`);
		return data;
	},
};
