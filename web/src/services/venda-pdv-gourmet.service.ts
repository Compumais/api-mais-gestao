import { api } from "@/lib/axios";
import type { Paginacao } from "@/services/conta-mesa.service";

export interface VendaPdvGourmet {
	id: string;
	idempresa: string;
	idcontamesa: string | null;
	vendalocal: number | null;
	numeropdv: number;
	idvendaitem: string | null;
	datacriacao: string | null;
	dataalteracao: string | null;
	usuarioquefechouvenda: string;
}

export interface ListarVendasPdvGourmetResponse {
	data: VendaPdvGourmet[];
	paginacao: Paginacao;
}

export interface CriarVendaPdvGourmetData {
	idempresa: string;
	numeropdv: number;
	usuarioquefechouvenda: string;
	idcontamesa?: string;
	vendalocal?: number;
	idvendaitem?: string;
}

export interface AtualizarVendaPdvGourmetData {
	idcontamesa?: string;
	vendalocal?: number;
	numeropdv?: number;
	idvendaitem?: string;
	usuarioquefechouvenda?: string;
}

export const vendaPdvGourmetService = {
	async listar(params: {
		idempresa: string;
		idcontamesa?: string;
		numeropdv?: number;
		page?: number;
		limit?: number;
	}): Promise<ListarVendasPdvGourmetResponse> {
		const { data } = await api.get<ListarVendasPdvGourmetResponse>(
			"/vendas-pdv-gourmet",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<VendaPdvGourmet> {
		const { data } = await api.get<VendaPdvGourmet>(`/vendas-pdv-gourmet/${id}`);
		return data;
	},

	async criar(dados: CriarVendaPdvGourmetData): Promise<VendaPdvGourmet> {
		const { data } = await api.post<VendaPdvGourmet>(
			"/vendas-pdv-gourmet",
			dados,
		);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarVendaPdvGourmetData,
	): Promise<VendaPdvGourmet> {
		const { data } = await api.put<VendaPdvGourmet>(
			`/vendas-pdv-gourmet/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/vendas-pdv-gourmet/${id}`);
	},
};
