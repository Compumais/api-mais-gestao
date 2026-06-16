import { api } from "@/lib/axios";
import type { Paginacao } from "@/services/conta-mesa.service";

export interface VendaPdvItem {
	id: string;
	idempresa: string;
	idvenda: string;
	idproduto: string;
	quantidade: string;
	precounitario: string;
	precototal: string;
	precopromocao: string;
	precoalterado: string;
	taxaservico: number | null;
}

export interface ListarVendasPdvItemResponse {
	data: VendaPdvItem[];
	paginacao: Paginacao;
}

export interface CriarVendaPdvItemData {
	idempresa: string;
	idvenda: string;
	idproduto: string;
	quantidade: string;
	precounitario: string;
	precototal: string;
	precopromocao: string;
	precoalterado: string;
	taxaservico?: number;
}

export interface AtualizarVendaPdvItemData {
	quantidade?: string;
	precounitario?: string;
	precototal?: string;
	precopromocao?: string;
	precoalterado?: string;
	taxaservico?: number;
}

export const vendaPdvItemService = {
	async listar(params: {
		idempresa: string;
		idvenda?: string;
		page?: number;
		limit?: number;
	}): Promise<ListarVendasPdvItemResponse> {
		const { data } = await api.get<ListarVendasPdvItemResponse>(
			"/vendas-pdv-item",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<VendaPdvItem> {
		const { data } = await api.get<VendaPdvItem>(`/vendas-pdv-item/${id}`);
		return data;
	},

	async criar(dados: CriarVendaPdvItemData): Promise<VendaPdvItem> {
		const { data } = await api.post<VendaPdvItem>("/vendas-pdv-item", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarVendaPdvItemData,
	): Promise<VendaPdvItem> {
		const { data } = await api.put<VendaPdvItem>(
			`/vendas-pdv-item/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/vendas-pdv-item/${id}`);
	},
};
