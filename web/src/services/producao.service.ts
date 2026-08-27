import { api } from "@/lib/axios";

export type RegistroProducao = {
	id: string;
	idempresa: string;
	idfichaproducao: string;
	idprodutoacabado: string;
	origem: number;
	quantidadeproduzida: string;
	custototal: string | null;
	custounitario: string | null;
	idoriginal: string | null;
	tipoestoque: number;
	idusuario: string | null;
	status: number;
	datahora: string;
	nomeprodutoacabado?: string | null;
	codigoprodutoacabado?: number | string | null;
};

export type ListarProducoesResponse = {
	data: RegistroProducao[];
	paginacao: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
};

export const producaoService = {
	async listar(params: {
		idempresa: string;
		page?: number;
		limit?: number;
		origem?: number;
		idprodutoacabado?: string;
		nome?: string;
		codigo?: string;
		datahora?: string;
		ordenarPor?: string;
		ordem?: "asc" | "desc";
	}): Promise<ListarProducoesResponse> {
		const { data } = await api.get<ListarProducoesResponse>("/producoes", {
			params,
		});
		return data;
	},

	async buscar(id: string): Promise<RegistroProducao & { itens?: unknown[] }> {
		const { data } = await api.get(`/producoes/${id}`);
		return data;
	},
};
