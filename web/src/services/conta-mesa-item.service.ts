import { api } from "@/lib/axios";
import type { Paginacao } from "@/services/conta-mesa.service";

export interface ContaMesaItem {
	id: string;
	idproduto: string;
	couverartistico: number | null;
	dataabertura: string | null;
	idcontamesa: string;
	idgarcom: string;
	nomeproduto: string;
	observacao: string | null;
	quantidade: string;
	precopromocao: string;
	precoalterado: string;
	precounitario: string;
	taxaservico: number | null;
	unidademedida: string;
}

export interface ListarContasMesaItemResponse {
	data: ContaMesaItem[];
	paginacao: Paginacao;
}

export interface CriarContaMesaItemData {
	idproduto: string;
	idcontamesa: string;
	idgarcom: string;
	nomeproduto: string;
	quantidade: string;
	precopromocao: string;
	precoalterado: string;
	precounitario: string;
	unidademedida: string;
	couverartistico?: number;
	observacao?: string;
	taxaservico?: number;
}

export interface AtualizarContaMesaItemData {
	nomeproduto?: string;
	quantidade?: string;
	precopromocao?: string;
	precoalterado?: string;
	precounitario?: string;
	observacao?: string;
	taxaservico?: number;
	couverartistico?: number;
}

export const contaMesaItemService = {
	async listar(params: {
		idcontamesa: string;
		page?: number;
		limit?: number;
	}): Promise<ListarContasMesaItemResponse> {
		const { data } = await api.get<ListarContasMesaItemResponse>(
			"/contas-mesa-item",
			{ params },
		);
		return data;
	},

	async buscar(id: string): Promise<ContaMesaItem> {
		const { data } = await api.get<ContaMesaItem>(`/contas-mesa-item/${id}`);
		return data;
	},

	async criar(dados: CriarContaMesaItemData): Promise<ContaMesaItem> {
		const { data } = await api.post<ContaMesaItem>("/contas-mesa-item", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: AtualizarContaMesaItemData,
	): Promise<ContaMesaItem> {
		const { data } = await api.put<ContaMesaItem>(
			`/contas-mesa-item/${id}`,
			dados,
		);
		return data;
	},

	async deletar(id: string): Promise<void> {
		await api.delete(`/contas-mesa-item/${id}`);
	},
};
