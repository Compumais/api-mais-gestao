import { api } from "@/lib/axios";

export type RemessaBancaria = {
	id: string;
	idempresa: string;
	idcontacorrente: string;
	sequencia: number;
	layout: string;
	status: string;
	nomearquivo: string | null;
	criadoem: string;
	enviadaem: string | null;
};

export type RemessaBancariaItem = {
	id: string;
	idremessa: string;
	idfinanceiro: string;
	idcobranca: string | null;
	nossonumero: string | null;
};

export const remessaBancariaService = {
	async listar(params: {
		idempresa: string;
		idcontacorrente?: string;
		status?: string;
		page?: number;
		limit?: number;
	}) {
		const { data } = await api.get<{
			data: RemessaBancaria[];
			paginacao: {
				page: number;
				limit: number;
				total: number;
				totalPages: number;
			};
		}>("/remessas-bancarias", { params });
		return data;
	},

	async buscar(id: string, idempresa: string) {
		const { data } = await api.get<{
			remessa: RemessaBancaria;
			itens: RemessaBancariaItem[];
		}>(`/remessas-bancarias/${id}`, { params: { idempresa } });
		return data;
	},

	async marcarEnviada(id: string, idempresa: string) {
		const { data } = await api.post<RemessaBancaria>(
			`/remessas-bancarias/${id}/marcar-enviada`,
			{ idempresa },
		);
		return data;
	},

	urlDownload(id: string, idempresa: string) {
		return `/remessas-bancarias/${id}/download?idempresa=${encodeURIComponent(idempresa)}`;
	},
};
